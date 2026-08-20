"""Pure-Python tests for the Telegram gateway parser (no network)."""
from __future__ import annotations

from app.gateways.telegram import parse_update


def test_parse_text_message() -> None:
    update = {
        "update_id": 1,
        "message": {
            "message_id": 42,
            "date": 1724121600,
            "chat": {"id": 551, "type": "private"},
            "from": {"id": 551, "first_name": "Trader", "last_name": "Ade"},
            "text": "Sold 3 bags of rice to Tunde, paid 10000",
        },
    }
    env = parse_update(update)
    assert env is not None
    assert env.chat_id == 551
    assert env.type == "text"
    assert env.text == "Sold 3 bags of rice to Tunde, paid 10000"
    assert env.profile_name == "Trader Ade"
    # Stable source id = update_id:chat_id:message_id
    assert env.id == "1:551:42"


def test_parse_unsupported_message() -> None:
    update = {
        "update_id": 2,
        "message": {"message_id": 1, "date": 1724121600, "chat": {"id": 1}, "sticker": {}},
    }
    assert parse_update(update) is None


def test_parse_voice_message() -> None:
    update = {
        "update_id": 3,
        "message": {
            "message_id": 7,
            "date": 1724121600,
            "chat": {"id": 999, "type": "private"},
            "voice": {
                "file_id": "AwACAgIAAxk...",
                "mime_type": "audio/ogg",
                "duration": 5,
            },
        },
    }
    env = parse_update(update)
    assert env is not None
    assert env.type == "audio"
    assert env.audio_file_id == "AwACAgIAAxk..."
    assert env.audio_mime == "audio/ogg"
    assert env.text is None
