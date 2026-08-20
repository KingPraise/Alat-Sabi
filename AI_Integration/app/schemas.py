"""Canonical ExtractedInstruction model (README §6) + JSON Schema for Gemini,
plus the IncomingMessage envelope handed off from the gateway to the pipeline.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# --- enums (mirrored from README §6) ---
Lang = Literal["en", "pcm", "yor", "mixed"]
TxType = Literal["sale", "purchase", "payment", "refund"]
PayMethod = Literal["cash", "transfer", "pos", "mixed", "unknown"]
AmountUnit = Literal["minor"]
Channel = Literal["telegram"]
MsgType = Literal["text", "audio"]


class IncomingMessage(BaseModel):
    """Normalized inbound message handed to the pipeline (gateway → worker).

    The Telegram gateway fills these fields from an inbound Update; the worker
    uses `source_message_id` for idempotency and either `text` or
    `audio_bytes` to drive STT + extraction.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="Provider-assigned unique id (for dedupe)")
    channel: Channel = "telegram"
    chat_id: int = Field(..., description="Telegram chat id — used for replies")
    from_id: int | None = Field(default=None, description="Telegram user id of the sender")
    profile_name: str | None = Field(
        default=None, description="Display name of the sender if available"
    )
    type: MsgType
    text: str | None = None
    audio_bytes: bytes | None = Field(
        default=None, description="Raw audio bytes (ogg/opus) downloaded via getFile"
    )
    audio_mime: str | None = Field(
        default=None, description="e.g. audio/ogg; codecs=opus"
    )
    audio_file_id: str | None = Field(
        default=None, description="Telegram file_id of the audio, kept for retries"
    )
    received_at: datetime


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    qty: int = Field(default=1, ge=1)
    unit_price_minor: int | None = Field(default=None, ge=0)
    unit: str | None = None


class ExtractedInstruction(BaseModel):
    """System of record for one parsed trader message (README §6)."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0.0"] = "1.0.0"
    source_message_id: str
    lang: Lang
    transaction_type: TxType

    items: list[Item] = Field(min_length=1)

    total_amount: int | None = Field(default=None, ge=0)
    cash_paid: int | None = Field(default=None, ge=0)
    debt_amount: int | None = Field(default=None, ge=0)
    debtor_name: str | None = None
    debtor_phone: str | None = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")

    currency: Literal["NGN"] = "NGN"
    amount_unit: AmountUnit = "minor"
    payment_method: PayMethod = "unknown"

    occurred_at: datetime | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    raw_transcript: str | None = None

    @field_validator("items")
    @classmethod
    def _at_least_one_item(cls, v: list[Item]) -> list[Item]:
        if not v:
            raise ValueError("items must contain at least one entry")
        return v


# --- The JSON Schema dict we hand to Gemini as `response_schema` ---
# (subset that Gemini's structured-output mode supports: enum / type / properties / required / items)
CANONICAL_JSON_SCHEMA: dict = {
    "type": "OBJECT",
    "properties": {
        "schema_version": {"type": "STRING"},
        "source_message_id": {"type": "STRING"},
        "lang": {"type": "STRING", "enum": ["en", "pcm", "yor", "mixed"]},
        "transaction_type": {"type": "STRING", "enum": ["sale", "purchase", "payment", "refund"]},
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "qty": {"type": "INTEGER"},
                    "unit_price_minor": {"type": "INTEGER"},
                    "unit": {"type": "STRING"},
                },
                "required": ["name"],
            },
        },
        "total_amount": {"type": "INTEGER"},
        "cash_paid": {"type": "INTEGER"},
        "debt_amount": {"type": "INTEGER"},
        "debtor_name": {"type": "STRING"},
        "debtor_phone": {"type": "STRING"},
        "currency": {"type": "STRING", "enum": ["NGN"]},
        "amount_unit": {"type": "STRING", "enum": ["minor"]},
        "payment_method": {"type": "STRING", "enum": ["cash", "transfer", "pos", "mixed", "unknown"]},
        "occurred_at": {"type": "STRING"},
        "confidence": {"type": "NUMBER"},
        "raw_transcript": {"type": "STRING"},
    },
    "required": ["schema_version", "source_message_id", "lang", "transaction_type", "items", "currency"],
}
