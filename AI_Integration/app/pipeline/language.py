"""Lightweight language detection for English / Nigerian Pidgin / Yoruba.

Pidgin is not a first-class ISO code in most detectors, so we combine:
  1. a keyword heuristic (strong signal for Pidgin and Yoruba)
  2. a Gemini-side hint when available (see pipeline/stt.py)
"""
from __future__ import annotations

import re
from collections import Counter

# Curated marker sets. Lower-case, word-boundary matched where possible.
PIDGIN_MARKERS: set[str] = {
    "abeg", "wetin", "wia", "wio", "nko", "don", "gbas", "gbo", "correct",
    "oya", "chop", "am", "na", "dey", "dem", "no", "fit", "sabi", "wahala",
    "jare", "shey", "abeg", "oga", "bros", "sister", "pikin", "belle",
    "i sell", "i buy", "i pay", "i don", "abeg record", "she pay", "he pay",
    "e pay", "e no", "i no", "give am", "give me",
}

YORUBA_MARKERS: set[str] = {
    # romanised common forms
    "fun", "san", "kò", "ko", "jẹ", "je", "ta", "ra", "pẹ̀lẹ́", "pele",
    "ṣe", "se", "báwo", "bawo", "rẹ̀", "re", "wa", "lọ", "lo",
    "ẹ̀dè", "ede", "naira", "kilo", "kílò", "marun", "mẹrin", "m�ta",
    "ogun", "mẹ́ta", "mẹ́rin", "márùn", "ẹ̀wà", "ewa", "ọjà", "oja",
    "túndé", "tunde", "bose", "bọ́sẹ́", "mama", "baba", "papa",
    # common particles
    "mo", "ko", "se", "ti", "ba", "fun", "ni", "si", "lati",
}


def _count_markers(text: str, markers: set[str]) -> int:
    """Count marker hits as word/phrase substrings."""
    lower = f" {text.lower()} "
    hits = 0
    for m in markers:
        if " " in m:
            if m in lower:
                hits += 1
        else:
            # word-boundary-ish check
            if re.search(rf"\b{re.escape(m)}\b", lower):
                hits += 1
    return hits


def detect_language(text: str, gemini_hint: str | None = None) -> str:
    """Return one of: 'en', 'pcm', 'yor', 'mixed'.

    Strategy:
      - compute marker counts for pidgin and yoruba
      - if Gemini's hint is reliable AND disagrees, prefer the explicit hint
      - otherwise pick the strongest signal; default 'en'
    """
    pidgin_hits = _count_markers(text, PIDGIN_MARKERS)
    yoruba_hits = _count_markers(text, YORUBA_MARKERS)

    counts = Counter(pcm=pidgin_hits, yor=yoruba_hits)
    top, top_count = counts.most_common(1)[0]

    # tie -> mixed (or default to gemini hint)
    tied = [lang for lang, c in counts.items() if c == top_count and c > 0]
    if len(tied) > 1:
        chosen = "mixed"
    elif top_count == 0:
        chosen = "en"
    else:
        chosen = "pcm" if top == "pcm" else "yor"

    # Gemini hint overrides if it disagrees AND we have no strong signal.
    if gemini_hint in {"en", "pcm", "yor"} and top_count <= 1:
        chosen = gemini_hint

    return chosen
