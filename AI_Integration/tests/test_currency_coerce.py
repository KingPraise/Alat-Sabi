"""Tests for the post-extraction coercion in pipeline/currency.py."""
from __future__ import annotations

from app.pipeline.currency import coerce
from app.schemas import ExtractedInstruction


def _payload(**overrides):
    base = {
        "source_message_id": "x",
        "lang": "en",
        "transaction_type": "sale",
        "items": [{"name": "bag of rice", "qty": 3}],
    }
    base.update(overrides)
    return ExtractedInstruction(**base)


def test_coerce_derives_debt() -> None:
    out = coerce(_payload(total_amount=15000, cash_paid=10000))
    assert out.debt_amount == 5000


def test_coerce_clears_debt_when_fully_paid() -> None:
    out = coerce(_payload(total_amount=10000, cash_paid=10000))
    assert out.debt_amount is None


def test_coerce_drops_negatives() -> None:
    # The schema rejects negatives at construction time, so to exercise the
    # "drop negatives" path in coerce() we have to bypass validation — close
    # enough to a sloppy LLM response slipping through a loosened schema.
    raw = _payload(total_amount=100, cash_paid=50)
    bad = raw.model_copy(update={"total_amount": -100, "cash_paid": -50})
    out = coerce(bad)
    assert out.total_amount is None
    assert out.cash_paid is None


def test_coerce_keeps_paid_only() -> None:
    out = coerce(_payload(cash_paid=5000))
    assert out.debt_amount is None  # not derivable without total
    assert out.cash_paid == 5000


def test_coerce_paid_exceeds_total() -> None:
    out = coerce(_payload(total_amount=1000, cash_paid=1500))
    # inconsistent — extractor error, drop derived debt rather than guess
    assert out.debt_amount is None
