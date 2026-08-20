"""Structured extraction via Gemini 1.5 Flash (JSON mode + response_schema)."""
from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from app.config import get_settings
from app.logging import get_logger
from app.pipeline.currency import coerce
from app.schemas import CANONICAL_JSON_SCHEMA, ExtractedInstruction

log = get_logger(__name__)


SYSTEM_INSTRUCTION = (
    "You are an invoice-extraction assistant for Nigerian market traders. "
    "The input is one trader message in English, Nigerian Pidgin, or Yoruba. "
    "Return ONLY valid JSON matching the provided schema. No prose, no markdown.\n\n"
    "Rules:\n"
    "  - All money fields are integer MINOR units (kobo for NGN). "
    "Convert spoken amounts like '5k', '5K', '₦5000', 'five thousand naira', "
    "'marun naira' → 500000 kobo. '5 naira' → 500 kobo.\n"
    "  - If a field is not stated, use null (omit strings, leave numbers null).\n"
    "  - Debtor name MUST be a proper noun / alias ('Mama Tope', 'Bose', 'Tunde'). "
    "Pronouns ('she', 'he', 'e', 'ó') NEVER resolve to debtor names.\n"
    "  - transaction_type ∈ {sale, purchase, payment, refund}. "
    "Default 'sale' when goods are being sold. 'payment' for 'Tunde paid 5k balance'.\n"
    "  - payment_method ∈ {cash, transfer, pos, mixed, unknown}. "
    "Default 'unknown' unless explicitly stated.\n"
    "  - Items array must contain at least one entry. qty defaults to 1.\n"
    "  - Set confidence (0..1) based on how unambiguous the message was."
)


def _build_client() -> Any:
    from google import genai  # local import for testability

    return genai.Client(api_key=get_settings().gemini_api_key)


def _set_schema_version(payload: dict[str, Any], source_message_id: str) -> dict[str, Any]:
    payload.setdefault("schema_version", "1.0.0")
    payload.setdefault("source_message_id", source_message_id)
    payload.setdefault("currency", "NGN")
    payload.setdefault("amount_unit", "minor")
    return payload


async def extract(
    transcript: str,
    *,
    source_message_id: str,
    lang_hint: str | None = None,
    client: Any | None = None,
) -> ExtractedInstruction:
    """Run structured extraction and return a validated ExtractedInstruction.

    Args:
        transcript: the text to extract from (raw text or STT output).
        source_message_id: idempotency key from the inbound message.
        lang_hint: optional detected lang ('en'/'pcm'/'yor') to bias the prompt.
        client: optional injected Gemini client (used by tests).
    """
    client = client or _build_client()
    from google.genai import types

    user_prompt = transcript
    if lang_hint:
        user_prompt = f"[Detected language: {lang_hint}]\n{transcript}"

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=CANONICAL_JSON_SCHEMA,
    )
    log.info("extract.request", extra={"lang_hint": lang_hint, "chars": len(transcript)})
    response = client.models.generate_content(
        model=get_settings().gemini_model,
        contents=user_prompt,
        config=config,
    )
    raw = response.text or "{}"
    import json
    try:
        payload_dict = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error("extract.invalid_json", extra={"raw": raw[:200]})
        raise ValueError(f"Extractor returned non-JSON: {e}") from e

    payload_dict = _set_schema_version(payload_dict, source_message_id)

    try:
        parsed = ExtractedInstruction.model_validate(payload_dict)
    except ValidationError as e:
        log.error("extract.schema_violation", extra={"errors": e.errors()})
        raise

    return coerce(parsed)
