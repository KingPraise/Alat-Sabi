"""arq worker — runs the heavy pipeline per message.

Job contract:
  - Receives an IncomingMessage JSON (audio_bytes is base64 in transit; we
    decode back to bytes here).
  - For text: runs language detection → extraction → coercion → forward.
  - For audio: downloads bytes (already done by main.py), runs STT →
    language detection → extraction → coercion → forward.
  - Replies in Telegram with a confirmation summary.
"""
from __future__ import annotations

import base64
from typing import Any

from arq import Arq, create_pool
from arq.connections import RedisSettings

from app.config import get_settings
from app.gateways import telegram as tg
from app.logging import configure_logging, get_logger
from app.pipeline import extract as extract_mod
from app.pipeline import language as lang_mod
from app.pipeline import stt as stt_mod
from app.schemas import IncomingMessage, ExtractedInstruction

log = get_logger(__name__)


def _redis_settings() -> RedisSettings:
    s = get_settings()
    # arq expects host/port; the URL may carry a db index and password.
    # Default to the simple localhost:6379 if parsing fails.
    url = s.redis_url
    if url.startswith("redis://"):
        url = url[len("redis://") :]
    auth, _, hostport = url.partition("@")
    if not hostport:
        hostport = auth
        auth = ""
    host, _, port_db = hostport.partition(":")
    port, _, db = port_db.partition("/")
    return RedisSettings(
        host=host or "localhost",
        port=int(port or 6379),
        database=int(db or 0),
        password=auth.split(":", 1)[1] if auth and ":" in auth else None,
    )


def _envelope_to_dict(env: IncomingMessage) -> dict[str, Any]:
    """Serialize the envelope for arq. Audio bytes travel as base64."""
    data = env.model_dump(mode="json")
    if env.audio_bytes is not None:
        data["audio_bytes"] = base64.b64encode(env.audio_bytes).decode("ascii")
    return data


def _dict_to_envelope(data: dict[str, Any]) -> IncomingMessage:
    if "audio_bytes" in data and isinstance(data["audio_bytes"], str):
        data = {**data, "audio_bytes": base64.b64decode(data["audio_bytes"])}
    # Drop the helper key so pydantic doesn't reject it under extra=forbid.
    data.pop("audio_bytes_b64", None)
    return IncomingMessage.model_validate(data)


async def enqueue_message(envelope: IncomingMessage) -> None:
    """Push an IncomingMessage onto the arq queue (used by the API)."""
    redis = await create_pool(_redis_settings())
    await redis.enqueue_job("process_message", _envelope_to_dict(envelope))


# --- the actual job -------------------------------------------------------


async def process_message(ctx: dict[str, Any], envelope_dict: dict[str, Any]) -> dict[str, Any]:
    """arq entrypoint — runs the full pipeline for one inbound message."""
    envelope = _dict_to_envelope(envelope_dict)

    try:
        # 1. Get text (transcribe audio first if needed).
        if envelope.type == "audio":
            if envelope.audio_bytes is None:
                log.error("worker.missing_audio", extra={"id": envelope.id})
                return {"status": "skipped", "reason": "missing audio bytes"}
            mime = envelope.audio_mime or "audio/ogg"
            transcript, gemini_lang = await stt_mod.transcribe(envelope.audio_bytes, mime)
            lang = lang_mod.detect_language(transcript, gemini_hint=gemini_lang)
        else:
            transcript = envelope.text or ""
            lang = lang_mod.detect_language(transcript)

        if not transcript.strip():
            await tg.send_text(envelope.chat_id, "Sorry — I couldn't read your message. Please try again.")
            return {"status": "no_text"}

        # 2. Extract structured payload.
        try:
            payload: ExtractedInstruction = await extract_mod.extract(
                transcript,
                source_message_id=envelope.id,
                lang_hint=lang,
            )
        except Exception as e:  # noqa: BLE001
            log.error("worker.extract_failed", extra={"id": envelope.id, "error": str(e)})
            await tg.send_text(
                envelope.chat_id,
                "I couldn't quite parse that. Could you rephrase — e.g. "
                "'Sold 3 bags of rice to Tunde, paid 10k cash, balance 5k'?",
            )
            return {"status": "extract_failed"}

        # 3. Reply with a short confirmation. Rendering + webhook forwarding
        # would slot in here; the forwarder module already exists (see §7).
        summary = _summary(payload)
        await tg.send_text(envelope.chat_id, summary)

        log.info(
            "worker.done",
            extra={
                "id": envelope.id,
                "lang": lang,
                "transaction_type": payload.transaction_type,
                "total_amount": payload.total_amount,
            },
        )
        return {"status": "ok"}
    except Exception as e:  # noqa: BLE001
        log.exception("worker.crash", extra={"id": envelope.id})
        return {"status": "error", "error": str(e)}


def _summary(p: ExtractedInstruction) -> str:
    """Short human-friendly confirmation line for Telegram."""
    items = ", ".join(f"{i.qty}× {i.name}" for i in p.items[:3])
    if len(p.items) > 3:
        items += "…"
    ngn = (lambda v: f"₦{v / 100:,.2f}" if v is not None else "—")
    parts = [
        f"Recorded: <b>{p.transaction_type}</b> — {items}",
        f"Total: {ngn(p.total_amount)}",
    ]
    if p.cash_paid is not None:
        parts.append(f"Paid: {ngn(p.cash_paid)}")
    if p.debt_amount is not None and p.debt_amount > 0:
        parts.append(f"Balance: {ngn(p.debt_amount)}")
    if p.debtor_name:
        parts.append(f"For: {p.debtor_name}")
    return "\n".join(parts)


# --- arq WorkerSettings ---------------------------------------------------


class WorkerSettings:
    """arq looks for this exact name to boot the worker."""

    functions = [process_message]
    redis_settings = _redis_settings
    on_startup = lambda: configure_logging()  # noqa: E731
    keep_result = 60
    max_tries = 1  # arq is the queue; our own retry lives in forwarder.py
