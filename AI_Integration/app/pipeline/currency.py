"""Post-extraction coercion: ensure integer minor units, derive debt_amount.

Per README §5.4:
  - if both cash_paid and total_amount are stated: debt_amount = total - paid
  - if only cash_paid is stated for a credit sale: leave debt_amount = null
"""
from __future__ import annotations

from app.schemas import ExtractedInstruction


def coerce(payload: ExtractedInstruction) -> ExtractedInstruction:
    """Return a new payload with integer minor units and a derived debt_amount.

    The Gemini extractor is asked to emit minor units in the first place, but
    LLM responses are not 100% reliable — this pass:
      1. casts numeric fields to int (drops trailing garbage)
      2. drops negative values (treating them as extraction errors)
      3. recomputes debt_amount when total and paid are both present
    """
    total = _to_int_or_none(payload.total_amount)
    paid = _to_int_or_none(payload.cash_paid)
    debt = _to_int_or_none(payload.debt_amount)

    if total is not None and paid is not None and total >= paid:
        derived = total - paid
        debt = derived if derived > 0 else None
    elif total is not None and paid is not None and paid > total:
        # extractor is inconsistent — keep extracted values but flag via debt None
        debt = None

    return payload.model_copy(
        update={
            "total_amount": total,
            "cash_paid": paid,
            "debt_amount": debt,
        }
    )


def _to_int_or_none(value: int | float | None) -> int | None:
    if value is None:
        return None
    try:
        as_int = int(value)
    except (TypeError, ValueError):
        return None
    return as_int if as_int >= 0 else None
