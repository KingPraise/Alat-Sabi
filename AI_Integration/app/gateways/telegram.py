"""Telegram Bot API gateway.

Responsibilities (per README §3.3 — adapted for Telegram):
  1. Verify the X-Telegram-Bot-Api-Secret-Token header (if configured).
  2. Normalize one inbound Update → an IncomingMessage envelope.
     Text messages use the inline `text`; voice notes use the file_id and are
     downloaded via the getFile endpoint.
  3. Provide `send_text`, `send_document` helpers that the worker calls to
     reply to the trader.
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.logging import get_logger
from app.schemas import IncomingMessage

log = get_logger(__name__)


# --- public exception so main.py can map to 401/403 ---

class TelegramAuthError(Exception):
    """Raised when the inbound webhook secret-token check fails."""


# --- helpers ---------------------------------------------------------------


def _api_base() -> str:
    s = get_settings()
    return f"{s.telegram_api_base.rstrip('/')}/bot{s.telegram_bot_token}"


def _file_base() -> str:
    s = get_settings()
    return f"{s.telegram_api_base.rstrip('/')}/file/bot{s.telegram_bot_token}"


def verify_secret_token(provided: str | None) -> None:
    """Validate the X-Telegram-Bot-Api-Secret-Token header.

    Telegram hashes the secret you pass to setWebhook with SHA-256 + your
    secret as the key (HMAC), then compares the hex digest. We mirror that.
    If no secret is configured, the check is skipped — but a warning is
    logged on startup by main.py.
    """
    expected_secret = get_settings().telegram_webhook_secret
    if not expected_secret:
        return
    if not provided:
        raise TelegramAuthError("missing X-Telegram-Bot-Api-Secret-Token")
    digest = hmac.new(expected_secret.encode("utf-8"), b"", hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, provided):
        raise TelegramAuthError("X-Telegram-Bot-Api-Secret-Token mismatch")


def _extract_message(update: dict[str, Any]) -> dict[str, Any] | None:
    """Pull the first message out of an Update. Handles edited_message too."""
    return (
        update.get("message")
        or update.get("edited_message")
        or update.get("channel_post")
    )


def _profile_name(msg: dict[str, Any]) -> str | None:
    frm = msg.get("from") or {}
    parts = [frm.get("first_name"), frm.get("last_name")]
    name = " ".join(p for p in parts if p)
    return name or frm.get("username")


def _message_type(msg: dict[str, Any]) -> tuple[str, str | None, str | None] | None:
    """Return (type, text/file_id, mime) or None if unsupported."""
    if "text" in msg:
        return ("text", msg["text"], None)
    voice = msg.get("voice")
    if voice:
        return ("audio", voice.get("file_id"), voice.get("mime_type"))
    audio = msg.get("audio")
    if audio:
        return ("audio", audio.get("file_id"), audio.get("mime_type"))
    return None


# --- inbound parsing -------------------------------------------------------


def parse_update(update: dict[str, Any]) -> IncomingMessage | None:
    """Turn one Telegram Update dict into an IncomingMessage, or None if unsupported."""
    msg = _extract_message(update)
    if msg is None:
        return None
    parsed = _message_type(msg)
    if parsed is None:
        return None
    kind, content, mime = parsed
    chat = msg.get("chat") or {}
    frm = msg.get("from") or {}

    # Telegram update_id + chat+message_id gives us a stable source id
    update_id = update.get("update_id")
    msg_id = msg.get("message_id")
    source_id = f"{update_id}:{chat.get('id')}:{msg_id}"

    received_at = datetime.fromtimestamp(msg.get("date", 0), tz=timezone.utc)
    base = {
        "id": source_id,
        "channel": "telegram",
        "chat_id": chat.get("id"),
        "from_id": frm.get("id"),
        "profile_name": _profile_name(msg),
        "received_at": received_at,
    }
    if kind == "text":
        return IncomingMessage(**base, type="text", text=content or "")
    # audio — file_id stored, bytes downloaded separately by download_audio()
    return IncomingMessage(
        **base,
        type="audio",
        audio_file_id=content,
        audio_mime=mime or "audio/ogg",
    )


# --- file download (for voice notes) ---------------------------------------


async def download_audio(
    file_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> bytes:
    """Resolve `file_id` → Telegram `file_path` → raw bytes via the Bot API."""
    owns = client is None
    client = client or httpx.AsyncClient(timeout=httpx.Timeout(15.0))
    try:
        meta = await client.get(f"{_api_base()}/getFile", params={"file_id": file_id})
        meta.raise_for_status()
        payload = meta.json()
        if not payload.get("ok"):
            raise RuntimeError(f"getFile failed: {payload}")
        file_path = payload["result"]["file_path"]
        log.info("telegram.get_file", extra={"file_id": file_id, "file_path": file_path})
        resp = await client.get(f"{_file_base()}/{file_path}")
        resp.raise_for_status()
        return resp.content
    finally:
        if owns:
            await client.aclose()


# --- outbound helpers ------------------------------------------------------


async def send_text(
    chat_id: int,
    text: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Send a plain text reply. Trims to 4096 chars (Telegram's message limit)."""
    if len(text) > 4096:
        text = text[:4095] + "…"
    owns = client is None
    client = client or httpx.AsyncClient(timeout=httpx.Timeout(10.0))
    try:
        resp = await client.post(
            f"{_api_base()}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
        )
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns:
            await client.aclose()


async def send_document(
    chat_id: int,
    document: bytes,
    filename: str,
    *,
    caption: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Send a PDF/image reply as a Telegram document upload."""
    owns = client is None
    client = client or httpx.AsyncClient(timeout=httpx.Timeout(30.0))
    try:
        files = {"document": (filename, document, "application/octet-stream")}
        data: dict[str, Any] = {"chat_id": str(chat_id)}
        if caption:
            data["caption"] = caption[:1024]
        resp = await client.post(f"{_api_base()}/sendDocument", data=data, files=files)
        resp.raise_for_status()
        return resp.json()
    finally:
        if owns:
            await client.aclose()
