"""HMAC-signed backend forwarding with exponential-backoff retries.

Per README §7:
  - POST {BACKEND_WEBHOOK_URL}/v1/instructions
  - Headers: Content-Type, X-Bot-Signature: sha256=<hmac>, X-Bot-Id, X-Bot-Timestamp, Idempotency-Key
  - Retry [1, 2, 4, 8, 16, 32]s with jitter; max 6 attempts
  - 2xx + 409 = success; everything else retryable; finally dead-letter (logged)
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import random
import time
from typing import Any

import httpx

from app.config import get_settings
from app.logging import get_logger
from app.schemas import ExtractedInstruction

log = get_logger(__name__)

RETRY_DELAYS_S = [1, 2, 4, 8, 16, 32]
BOT_ID = "telegram-invoice-bot"


class ForwardResult:
    """Outcome of a forward() call."""

    __slots__ = ("delivered", "status_code", "attempts", "response_body", "last_error")

    def __init__(
        self,
        delivered: bool,
        status_code: int | None,
        attempts: int,
        response_body: dict[str, Any] | None,
        last_error: str | None = None,
    ):
        self.delivered = delivered
        self.status_code = status_code
        self.attempts = attempts
        self.response_body = response_body
        self.last_error = last_error

    def __repr__(self) -> str:
        return (
            f"ForwardResult(delivered={self.delivered}, status={self.status_code}, "
            f"attempts={self.attempts}, error={self.last_error!r})"
        )


def _sign(raw_body: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _is_success(status_code: int) -> bool:
    return 200 <= status_code < 300 or status_code == 409


async def forward(
    payload: ExtractedInstruction,
    *,
    client: httpx.AsyncClient | None = None,
    endpoint: str | None = None,
    secret: str | None = None,
) -> ForwardResult:
    """Send `payload` to the backend with retries. Returns a ForwardResult."""
    settings = get_settings()
    endpoint = endpoint or f"{settings.backend_webhook_url.rstrip('/')}/v1/instructions"
    secret = secret or settings.webhook_shared_secret

    raw_body = payload.model_dump_json().encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Bot-Id": BOT_ID,
        "X-Bot-Timestamp": str(int(time.time())),
        "X-Bot-Signature": _sign(raw_body, secret),
        "Idempotency-Key": payload.source_message_id,
    }
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=httpx.Timeout(10.0))
    last_error: str | None = None
    last_status: int | None = None
    last_body: dict[str, Any] | None = None

    try:
        for attempt, delay in enumerate([0] + RETRY_DELAYS_S, start=1):
            if delay:
                # jittered exponential backoff
                await asyncio.sleep(delay + random.uniform(0, 0.5))
            log.info(
                "forward.attempt",
                extra={
                    "attempt": attempt,
                    "endpoint": endpoint,
                    "idempotency_key": payload.source_message_id,
                },
            )
            try:
                resp = await client.post(endpoint, content=raw_body, headers=headers)
                last_status = resp.status_code
                try:
                    last_body = resp.json()
                except json.JSONDecodeError:
                    last_body = None
                if _is_success(resp.status_code):
                    log.info(
                        "forward.success",
                        extra={"attempt": attempt, "status": resp.status_code},
                    )
                    return ForwardResult(
                        delivered=True,
                        status_code=resp.status_code,
                        attempts=attempt,
                        response_body=last_body,
                    )
                last_error = f"HTTP {resp.status_code}"
            except httpx.HTTPError as e:
                last_error = f"{type(e).__name__}: {e}"

        # exhausted retries — dead-letter
        log.error(
            "forward.dead_letter",
            extra={
                "attempts": len(RETRY_DELAYS_S) + 1,
                "last_status": last_status,
                "last_error": last_error,
                "idempotency_key": payload.source_message_id,
            },
        )
        return ForwardResult(
            delivered=False,
            status_code=last_status,
            attempts=len(RETRY_DELAYS_S) + 1,
            response_body=last_body,
            last_error=last_error,
        )
    finally:
        if owns_client:
            await client.aclose()
