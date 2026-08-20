"""Audio transcription via Gemini 1.5 Flash (multimodal)."""
from __future__ import annotations

import json
import re
from typing import Any

from google.genai import types

from app.config import get_settings
from app.logging import get_logger

log = get_logger(__name__)


SYSTEM_INSTRUCTION = (
    "You are an audio transcription assistant for Nigerian market traders. "
    "The audio may be in English, Nigerian Pidgin, or Yoruba, often blended. "
    "Transcribe it VERBATIM in its original language(s). Do not translate. "
    "Do not summarise. Output strict JSON with two fields:\n"
    '  "lang": one of "en", "pcm", "yor", "mixed"\n'
    '  "transcript": the verbatim text'
)


def _build_client() -> Any:
    """Lazy import so tests can patch the client without loading the SDK at import time."""
    from google import genai  # local import for testability

    return genai.Client(api_key=get_settings().gemini_api_key)


def _decode_json(text: str) -> dict[str, Any]:
    """Best-effort JSON extraction from a model response."""
    text = text.strip()
    # Strip ```json fences if the model wrapped its reply.
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # fall back to finding the first {...} block
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


async def transcribe(
    audio_bytes: bytes,
    mime_type: str,
    *,
    client: Any | None = None,
) -> tuple[str, str]:
    """Return (transcript, lang).

    Args:
        audio_bytes: raw audio blob (e.g. audio/ogg from a Telegram voice note).
        mime_type: e.g. 'audio/ogg', 'audio/ogg; codecs=opus'.
        client: optional injected client (used by tests).
    """
    client = client or _build_client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema={
            "type": "OBJECT",
            "properties": {
                "lang": {"type": "STRING", "enum": ["en", "pcm", "yor", "mixed"]},
                "transcript": {"type": "STRING"},
            },
            "required": ["lang", "transcript"],
        },
    )
    log.info("stt.request", extra={"mime": mime_type, "bytes": len(audio_bytes)})
    response = client.models.generate_content(
        model=get_settings().gemini_model,
        contents=[
            "Transcribe the following audio exactly as spoken.",
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type.split(";")[0].strip()),
        ],
        config=config,
    )
    parsed = _decode_json(response.text)
    transcript = (parsed.get("transcript") or "").strip()
    lang = parsed.get("lang") or "en"
    if lang not in {"en", "pcm", "yor", "mixed"}:
        lang = "en"
    return transcript, lang
