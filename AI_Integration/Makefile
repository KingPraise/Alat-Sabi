PY     ?= python
PIP    ?= $(PY) -m pip

.PHONY: install test lint run worker register-webhook

install:
	$(PIP) install -e ".[dev]"

test:
	$(PY) -m pytest -v

lint:
	$(PY) -m ruff check app tests

run:
	$(PY) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

worker:
	$(PY) -m arq app.worker.WorkerSettings

# Register the public webhook URL with Telegram (one-shot after deploy).
# Usage: make register-webhook URL=https://your.host/webhooks/telegram
register-webhook:
	curl -F "url=$(URL)" \
	     -F "secret_token=$(TELEGRAM_WEBHOOK_SECRET)" \
	     https://api.telegram.org/bot$(TELEGRAM_BOT_TOKEN)/setWebhook
