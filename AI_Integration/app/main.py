"""FastAPI app — receives Telegram webhook updates and enqueues async work.

Why so thin? Telegram recommends responding to webhooks quickly. Heavy work
(STT, extraction, backend forwarding, rendering, reply) runs in the arq
worker — see ``app.worker``. The handler only:
  1. Verifies the X-Telegram-Bot-Api-Secret-Token header.
  2. Parses the Update into an IncomingMessage.
  3. For voice notes: downloads the audio via getFile so the worker doesn't
     need network access to Telegram (audio bytes ride along in the job).
  4. Enqueues the envelope on Redis.
  5. Returns 200 OK to Telegram.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.gateways.telegram import (
    TelegramAuthError,
    download_audio,
    parse_update,
    verify_secret_token,
)
from app.logging import configure_logging, get_logger
from app.schemas import IncomingMessage

log = get_logger(__name__)

# arq imports the worker settings — import here so misconfiguration surfaces
# at app startup rather than on the first webhook.
from app.worker import enqueue_message  # noqa: E402  (after logging setup)

app = FastAPI(title="Telegram Invoice Bot", version="0.1.0")


@app.on_event("startup")
def _startup() -> None:
    configure_logging()
    s = get_settings()
    if not s.telegram_webhook_secret:
        log.warning(
            "telegram.no_webhook_secret",
            extra={"hint": "set TELEGRAM_WEBHOOK_SECRET and re-call setWebhook"},
        )


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhooks/telegram")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> JSONResponse:
    settings = get_settings()
    try:
        verify_secret_token(x_telegram_bot_api_secret_token)
    except TelegramAuthError as e:
        log.warning("telegram.auth_failed", extra={"reason": str(e)})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid secret token")

    try:
        update: dict[str, Any] = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid JSON")

    envelope = parse_update(update)
    if envelope is None:
        # Telegram sends more than text/voice (stickers, commands, etc). Ack
        # silently so we don't retry, but log it for visibility.
        log.info("telegram.update_skipped", extra={"update_id": update.get("update_id")})
        return JSONResponse({"ok": True, "skipped": True})

    # Voice notes: download bytes NOW so the worker is hermetic. Telegram
    # files are small (<20MB typically) and this sidesteps re-fetch races.
    if envelope.type == "audio" and envelope.audio_bytes is None and envelope.audio_file_id:
        try:
            envelope.audio_bytes = await download_audio(envelope.audio_file_id)
        except Exception as e:  # noqa: BLE001
            log.error(
                "telegram.download_audio_failed",
                extra={"file_id": envelope.audio_file_id, "error": str(e)},
            )
            return JSONResponse({"ok": True, "skipped": True, "reason": "audio download failed"})

    await enqueue_message(envelope)
    log.info(
        "telegram.enqueued",
        extra={
            "source_message_id": envelope.id,
            "chat_id": envelope.chat_id,
            "type": envelope.type,
        },
    )
    return JSONResponse({"ok": True})
