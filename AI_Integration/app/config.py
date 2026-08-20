"""Application settings loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Type-safe configuration. Fails loudly on startup if a required key is missing."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Gemini (STT + extraction) ---
    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = Field(
        default="gemini-1.5-flash",
        description="Gemini model id for both STT and extraction",
    )

    # --- Telegram Bot API ---
    telegram_bot_token: str = Field(..., description="Telegram bot token from @BotFather")
    telegram_webhook_secret: str | None = Field(
        default=None,
        description="Secret token set via setWebhook for X-Telegram-Bot-Api-Secret-Token validation",
    )
    telegram_api_base: str = Field(
        default="https://api.telegram.org",
        description="Override only for testing against a local Bot API server",
    )

    # --- Backend forwarding ---
    backend_webhook_url: str = Field(..., description="e.g. https://api.example.com")
    webhook_shared_secret: str = Field(
        ..., description="HMAC-SHA256 secret for X-Bot-Signature"
    )

    # --- Redis (arq) ---
    redis_url: str = Field(default="redis://localhost:6379/0")

    # --- Logging ---
    log_level: str = Field(default="INFO")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()  # type: ignore[call-arg]
