# Telegram Chatbot for Invoices — Requirements & Architecture

> **Purpose.** A Telegram-based assistant that accepts free-form text and voice-note messages (in English, Nigerian Pidgin, or Yoruba), extracts structured sales/credit information, and emits formal financial documents (invoices, receipts, credit/debt records) — surfaced back to the chat and forwarded to a backend system of record.

---

## 1. Scope & Personas

### 1.1 Primary Persona: The Trader (Small-Business Owner)
- Sells goods on credit and for cash.
- Uses Telegram daily; types quickly on a phone; often speaks instead of typing.
- Speaks a mix of English, Nigerian Pidgin, and Yoruba — sometimes blended mid-sentence.
- Needs a fast, low-friction way to record a sale ("I sold 3 bags of rice to Mama Tope, she paid 5k, balance 2k") and receive a clean invoice or receipt to forward to the buyer.

### 1.2 Secondary Personas
- **Buyer/Customer** — receives the invoice/receipt as a forwarded Telegram message.
- **Accountant/Manager** — consumes structured records via the backend webhook.

### 1.3 Out of Scope (v1)
- Multi-currency, inventory management, and payment-processor integration.
- Bi-directional negotiation (the bot is a recorder, not a salesperson).
- Languages beyond English / Nigerian Pidgin / Yoruba.

---

## 2. High-Level Architecture

```
┌──────────────┐     1. inbound msg     ┌────────────────────┐
│  Telegram    │ ───────────────────▶  │  Telegram Gateway  │
│  (user)      │ ◀───── 5. reply ────  │  (Bot API)         │
└──────────────┘                        │                    │
                                        └─────────┬──────────┘
                                                  │ 2. webhook POST
                                                  ▼
                                        ┌────────────────────┐
                                        │   Ingestion API    │
                                        │   (FastAPI)        │
                                        └─────────┬──────────┘
                                                  │ 3. enqueue
                                                  ▼
                                        ┌────────────────────┐
                                        │   Job Queue        │
                                        │   (Redis/arq)      │
                                        └─────────┬──────────┘
                                                  │ 4. dispatch
                                                  ▼
                ┌──────────────────┬──────────────┴───────────┬──────────────────┐
                ▼                  ▼                          ▼                  ▼
        ┌──────────────┐   ┌──────────────┐          ┌──────────────┐   ┌──────────────┐
        │ Text Parser  │   │ Audio STT    │          │ Language     │   │ Instruction  │
        │ (rules+LLM)  │   │ (Gemini)     │          │ Detector     │   │ Extractor    │
        └──────┬───────┘   └──────�───────┘          └──────┬───────┘   └──────┬───────┘
               │                  │                         │                  │
               └──────────┬───────┴────────────┬────────────┘                  │
                          ▼                    ▼                               ▼
                    ┌─────────────────────────────────┐                ┌──────────────────┐
                    │  Structured Payload (JSON)      │ ─────────────▶ │  Webhook Forward │
                    │  → see §6 schema                │                │  → Backend       │
                    └────────────────┬────────────────┘                └──────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │ Document Renderer               │
                    │ (HTML→PDF/Image)                │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  Telegram reply (text/doc/img)  │
                    └─────────────────────────────────┘
```

---

## 3. Telegram Bot — Setup

The bot is a thin FastAPI webhook + an arq worker. Telegram requires a
publicly reachable HTTPS endpoint to deliver updates; in development we
tunnel via `ngrok`.

### 3.1 Prerequisites
- A Telegram account and a chat with [@BotFather](https://t.me/BotFather).
- Create a bot (`/newbot`) and copy the **bot token** it returns.
- Pick a long random string and pass it to `setWebhook` as `secret_token` —
  this is what the gateway validates on every inbound update.
- A publicly reachable HTTPS endpoint for the webhook
  (use `ngrok` in dev: `ngrok http 8000`).

### 3.2 Required Environment Variables
```
TELEGRAM_BOT_TOKEN=<token_from_botfather>
TELEGRAM_WEBHOOK_SECRET=<same string passed to setWebhook>
# Optional override, e.g. local Bot API server
# TELEGRAM_API_BASE=https://api.telegram.org
```

### 3.3 Webhook Registration

After deploying, register the URL once:

```bash
curl -F "url=https://<your-host>/webhooks/telegram" \
     -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
     https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook
```

Or via the Makefile:

```bash
make register-webhook URL=https://your.host/webhooks/telegram
```

Telegram only delivers updates to one URL per bot. To temporarily disable
webhooks and use long-polling during development, call `deleteWebhook`.

### 3.4 Inbound Payload Shape (Telegram)

Telegram POSTs a single JSON body per Update. The gateway parses it and
ignores everything that isn't a `message` (or `edited_message`) with a
`text`, `voice`, or `audio` field. Edits are treated as fresh messages —
the worker idempotency key (`source_message_id`) prevents double-handling.

```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 42,
    "date": 1724121600,
    "chat":  { "id": 551234567, "type": "private" },
    "from":  { "id": 551234567, "first_name": "Trader", "last_name": "Ade" },
    "text":  "I sold 2 tubers of yam to Bose, she paid 4k, balance 1k"
  }
}
```

For voice notes, the body contains a `voice` object with a `file_id`; the
gateway resolves it via `getFile` and downloads the bytes **synchronously**
inside the webhook handler, so the worker can be hermetic.

```json
{
  "message": {
    "voice": {
      "file_id": "AwACAgIAAxk...",
      "mime_type": "audio/ogg",
      "duration": 7,
      "file_size": 18432
    }
  }
}
```

### 3.5 Gateway Service Responsibilities

1. **Authenticate** the request using the `X-Telegram-Bot-Api-Secret-Token`
   header. Telegram sends `HMAC-SHA256(secret_token, "")` (empty payload) —
   the gateway recomputes the digest and rejects mismatches with `401`.
2. **Normalize** each Update into an internal `IncomingMessage` envelope:
   ```python
   class IncomingMessage(BaseModel):
       id: str                # "<update_id>:<chat_id>:<message_id>"
       channel: Literal["telegram"]
       chat_id: int           # used as the reply target
       from_id: int | None
       profile_name: str | None
       type: Literal["text", "audio"]
       text: str | None
       audio_bytes: bytes | None    # already downloaded from getFile
       audio_mime: str | None
       audio_file_id: str | None
       received_at: datetime
   ```
3. **Download** voice bytes via the Bot API's `getFile` endpoint, using
   the same token. Audio lives in transient Redis (the job payload) rather
   than object storage in v1.
4. **Enqueue** the envelope on Redis (arq). All heavy work — STT,
   extraction, coercion, backend forwarding, document rendering, reply —
   happens in the worker.
5. **Acknowledge** within Telegram's preferred window. There's no hard
   timeout, but keeping the handler short avoids Telegram retries.

---

## 4. Audio Transcription & Extraction Pipeline

### 4.1 Transcription — Provider

The capture-layer bot uses **Google Gemini 1.5 Flash** for STT. We feed
the audio bytes directly to the multimodal `generateContent` endpoint in
one round-trip, which gives the best multilingual robustness for the
Pidgin / Yoruba audio we expect from market traders.

| Provider | Model | When to use |
|---|---|---|
| **Google Gemini 1.5 Flash** *(default)* | `gemini-1.5-flash` (audio input) | All inbound voice notes — best Pidgin/Yoruba handling. |
| *Reserved for v2* | OpenAI Whisper, etc. | Plug-in alt providers behind the same `stt.transcribe(audio_bytes, mime)` interface. |

The `STT_PROVIDER` env var and an alternate client factory in
`pipeline/stt.py` are the intended extension points.

### 4.2 Language Detection
- **For text:** run a lightweight classifier (`xlm-roberta-base-language-detection` or a fast API like `google-translate-v2 detect`). Pidgin (`pcm`) is not a first-class ISO code in many detectors — fall back to a custom keyword heuristic for Pidgin markers (`abeg`, `wetin`, `nko`, `don`, `gbas`, `correct`, `oya`, `chop`).
- **For audio:** let the STT model return its best transcription; do a second-pass language ID on the transcript.
- The detected `lang` is included in the payload (`lang: "en" | "pcm" | "yor"`) so downstream consumers can audit.

### 4.3 Whisper Integration Notes *(reserved)*
- Endpoint: `POST https://api.openai.com/v1/audio/transcriptions` (multipart form, `model=whisper-1`, `file=<ogg>`).
- For non-English/Pidgin/Yoruba audio, pass `language` parameter to improve accuracy and reduce hallucinations.
- Set `response_format=verbose_json` to get detected language; combine with our own detector for Pidgin.
- *Not wired up by default* — only relevant if you swap providers in `pipeline/stt.py`.

### 4.4 Gemini 1.5 Flash Integration Notes
- Use the multimodal `generateContent` endpoint with `inline_data` (base64) **or** `file_data` with a File API upload for >20 MB audio.
- Prompt the model to **transcribe AND extract** in one shot (see §4.5) — saves a round-trip.

### 4.5 Extraction — Structured Output
Use an LLM to convert the raw transcript (or original text) into the canonical JSON schema in §6. A single prompt handles both **transcription+extraction** for Gemini, or **extraction-only** after Whisper.

**Recommended system prompt (abbreviated):**
```
You are an invoice-extraction assistant for Nigerian market traders.
You accept messages in English, Nigerian Pidgin, and Yoruba.
Return ONLY valid JSON matching the schema provided. No prose, no markdown.
If a field is not stated, use null. Numbers are integers in the smallest
currency unit (kobo for NGN) unless otherwise marked. Convert spoken
amounts like "5k", "five thousand", "₦5000", "marun naira" → 500000 kobo.
```

**Schema enforcement** — always use structured outputs / JSON mode / tool-use:
- OpenAI: `response_format={"type":"json_schema", ...}` with the schema in §6.
- Gemini: `responseMimeType: "application/json"` + `responseSchema` (or tool-use).

---

## 5. Language-Specific Parsing Rules

All three languages must converge on the **same canonical JSON schema**. The extractor MUST handle these surface patterns.

### 5.1 English
| Phrase | Parsed |
|---|---|
| `"Sold 3 bags of rice to Tunde for 15000, paid 10000 cash"` | `items=[{name:"bag of rice", qty:3, unit_price_hint:5000}]`, `total_amount=15000`, `cash_paid=10000`, `debt_amount=5000`, `debtor_name="Tunde"`, `transaction_type="sale"` |
| `"Bought 2 cartons of indomie — 12000"` | `transaction_type="purchase"` |
| `"Tunde paid 5k balance"` | `transaction_type="payment"`, `cash_paid=5000`, `debtor_name="Tunde"` |

### 5.2 Nigerian Pidgin (`pcm`)
| Phrase | Parsed |
|---|---|
| `"I sell 2 tuber yam give Bose, she pay 4k, balance 1k"` | same as English sale; `debtor_name="Bose"`, `cash_paid=4000`, `debt_amount=1000`, `total_amount=5000` |
| `"Abeg record am: 5 sachet rice, Mama Tope, 7500, e pay 5k"` | `debtor_name="Mama Tope"`, `cash_paid=5000`, `debt_amount=2500` |
| `"Chop 1 bag garri — 3k cash"` | `transaction_type="sale"`, `payment_method="cash"` |

**Pidgin cues the extractor must recognize:** `sell/give`, `pay/abeg pay/drop`, `balance/remain/leftover`, `am = it/that`, `e = she/he/it`, `don = already/have`, `no = didn't`.

### 5.3 Yoruba (`yor`)
| Phrase | Parsed |
|---|---|
| `"Mo ta ẹ̀pà mẹ́ta fún Túndé, ó san ẹ̀dè márùn-ún"` | `qty=3`, `debtor_name="Túndé"`, `cash_paid=5000`, `debt_amount=null` (implied) |
| `"Kọ́kọ́ ẹ̀wà kan fún Mama Tope — 2k"` | `transaction_type="sale"`, `item="�̀wà"`, `cash_paid=2000` |
| `"Ó j�́ 100 naira, ó san 50"` | `total_amount=100`, `cash_paid=50`, `debt_amount=50` |

**Yoruba cues:** `ta = sell`, `ra = buy`, `fún = for/to`, `ó san = she/he paid`, `ẹ̀dè = Naira` (colloquial), `kò san = didn't pay`, `jẹ́ = it is/cost`.

### 5.4 Robustness Requirements
- Currency parsing: handle `5k`, `5K`, `5,000`, `5000`, `₦5000`, `five thousand naira`, `marun naira`, `ẹ̀dè márùn-ún`. All resolve to integer kobo.
- Item quantity defaults to `1` if unspecified.
- Debtor name MUST be a proper noun or known alias (`Mama Tope`, `Bose`, `Tunde`). Pronouns (`she`, `ó`, `e`) NEVER resolve to debtor names.
- If both `cash_paid` and `total_amount` are stated, **derive** `debt_amount = total_amount - cash_paid`. If only `cash_paid` is stated for a credit sale, leave `debt_amount = null` and let the backend reconcile.
- If the message is ambiguous (e.g., missing total), the bot MUST reply asking **one** clarifying question rather than guessing.

---

## 6. Canonical JSON Schema (System of Record)

Every extracted instruction MUST validate against this JSON Schema before being forwarded.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ExtractedInstruction",
  "type": "object",
  "required": ["schema_version", "source_message_id", "lang", "transaction_type", "items", "currency"],
  "properties": {
    "schema_version":   { "const": "1.0.0" },
    "source_message_id":{ "type": "string" },
    "lang":             { "enum": ["en", "pcm", "yor", "mixed"] },
    "transaction_type": { "enum": ["sale", "purchase", "payment", "refund"] },
    "items": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name":             { "type": "string", "minLength": 1 },
          "qty":              { "type": "integer", "minimum": 1, "default": 1 },
          "unit_price_minor": { "type": "integer", "minimum": 0 },
          "unit":             { "type": "string" }
        }
      }
    },
    "total_amount":   { "type": "integer", "minimum": 0 },
    "cash_paid":      { "type": "integer", "minimum": 0 },
    "debt_amount":    { "type": "integer", "minimum": 0 },
    "debtor_name":    { "type": "string" },
    "debtor_phone":   { "type": "string", "pattern": "^\\+?[0-9]{10,15}$" },
    "currency":       { "enum": ["NGN"], "default": "NGN" },
    "amount_unit":    { "enum": ["minor"], "default": "minor" },
    "payment_method": { "enum": ["cash", "transfer", "pos", "mixed", "unknown"], "default": "unknown" },
    "occurred_at":    { "type": "string", "format": "date-time" },
    "confidence":     { "type": "number", "minimum": 0, "maximum": 1 },
    "raw_transcript": { "type": "string" }
  },
  "additionalProperties": false
}
```

**Money convention.** All amounts are integers in **minor units** (kobo for NGN). `5000 naira = 500000` in the payload. This eliminates decimal-precision bugs downstream.

---

## 7. Backend Webhook Forwarding

### 7.1 Endpoint Contract
The chatbot service MUST `POST` every validated payload to:

```
POST  {BACKEND_WEBHOOK_URL}/v1/instructions
Headers:
  Content-Type: application/json
  X-Bot-Signature: sha256=<hmac_sha256(secret, raw_body)>
  X-Bot-Id:        telegram-invoice-bot
  X-Bot-Timestamp: <unix_seconds>
  Idempotency-Key: <source_message_id>
Headers MUST be set on every call.
```

### 7.2 Retries & Delivery Guarantees
- **At-least-once** delivery. The `Idempotency-Key` (== `source_message_id`) lets the backend de-dupe.
- Retry policy: exponential backoff with jitter — `1s, 2s, 4s, 8s, 16s, 32s` (max 6 attempts), then move to a **dead-letter queue** and surface a user-visible error in Telegram.
- Treat HTTP `2xx` as success; `409 Conflict` (duplicate idempotency key) as success-and-stop; everything else as retryable.

### 7.3 Signature Verification
- The bot computes `HMAC-SHA256(WEBHOOK_SHARED_SECRET, raw_body)` and sends it in `X-Bot-Signature`.
- Backend MUST verify before processing. Document the scheme in the bot's OpenAPI spec.

### 7.4 Backend Acknowledgement (Expected Response)
```json
{ "status": "accepted", "instruction_id": "uuid", "document_url": "https://..." }
```
The bot replies in Telegram with a summary + a PDF link or image of the generated document (§8).

---

## 8. Invoice / Financial Document Generation

### 8.1 Supported Document Types
| `transaction_type` | Document |
|---|---|
| `sale` (cash_paid == total) | **Receipt** |
| `sale` (cash_paid < total) | **Invoice + Credit Note** |
| `purchase` | **Purchase Receipt** |
| `payment` | **Payment Acknowledgement** |
| `refund` | **Refund Receipt** |

### 8.2 Renderer
- **HTML → PDF** via a headless renderer (WeasyPrint, Playwright, or Puppeteer). Templates use a simple, mobile-friendly layout:
  - Header: Trader name, date, document number (`INV-2026-000123`).
  - Body: line items table, totals box (subtotal, paid, balance).
  - Footer: contact details, "Thank you for your business", QR code linking to the digital record.
- **Telegram-friendly** alternative: render to a 1200×1600 PNG image using the same HTML+CSS. Telegram preserves document quality on upload; detect the user's previous preference and store it.

### 8.3 Document Numbering
- Format: `{PREFIX}-YYYY-NNNNNN` (e.g., `INV-2026-000123`). Sequence is per-trader, fetched from the backend.

### 8.4 Output Channels
- **In chat:** reply with a short text confirmation + the PDF/image attachment (`sendDocument`).
- **To buyer (optional):** if the trader mentions a buyer phone or Telegram handle, forward via the Bot API. Telegram has no 24-hour window restriction for bots that initiated the conversation, but the buyer must have interacted with the bot at least once (`/start`) for direct messages to succeed.

---

## 9. Conversation State & Idempotency

- Each `from` phone number has a short-lived conversation state (Redis, TTL 10 minutes) used to:
  - Hold a pending extracted instruction while waiting for confirmation.
  - Allow corrections (`"change the qty to 4"`).
  - Re-prompt when fields are missing.
- All replies MUST be deterministic for the same `source_message_id` (so a redelivered webhook doesn't double-send).

---

## 10. Security & Compliance

- **Phone numbers** are PII — store hashed (HMAC-SHA256 with `PII_SALT`) in logs; keep plaintext only in the operational DB.
- **Voice notes** may contain sensitive info — auto-delete from object storage after 30 days.
- **Webhook secret rotation** must be supported without downtime (overlap two valid secrets for 24h).
- **Provider signatures** MUST be verified on every inbound webhook; reject on mismatch.
- **Rate limiting** per sender (e.g., 30 msg/min) to prevent abuse.
- **Consent**: bot should be opt-in — Telegram requires the user to `/start` the bot before it can DM them; treat a first-message `start` as consent.

---

## 11. Observability

- Structured JSON logs with: `trace_id`, `source_message_id`, `provider`, `lang`, `transaction_type`, `latency_ms_stt`, `latency_ms_extract`, `latency_ms_forward`, `forward_status`.
- Metrics (Prometheus): `bot_messages_total{type,lang}`, `bot_extraction_failures_total{reason}`, `bot_forward_retries_total`, `bot_stt_cost_usd_total`.
- Traces (OpenTelemetry): one root span per message; child spans for STT, extraction, forward, render.
- Audit log table: every extracted instruction persisted with `raw_transcript` and `confidence` for review.

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| End-to-end latency (text → reply) | p95 ≤ 4 s |
| End-to-end latency (voice → reply) | p95 ≤ 12 s |
| Webhook acknowledgement | ≤ 5 s (Meta hard limit) |
| Availability | 99.5% (single-region acceptable for v1) |
| Cost ceiling | ≤ $0.02 per voice note (target) |

---

## 13. Local Development Quick-Start

```bash
# 1. Clone & install
git clone <repo-url>
cd telegram-invoice-bot
cp .env.example .env   # fill in TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_SECRET

# 2. Expose local port
ngrok http 8000
# Copy the https URL into your .env or the setWebhook call.

# 3. Run (api + worker + redis)
docker compose up       # if a compose file is provided
# or, in two terminals:
uvicorn app.main:app --reload --port 8000
arq app.worker.WorkerSettings

# 4. Register the webhook (one-shot after deploy)
make register-webhook URL=https://<your-ngrok-host>/webhooks/telegram

# 5. Test
# Open Telegram, find your bot by username, send /start, then:
# "I sold 3 bags of rice to Tunde, he paid 10000, balance 5000"
```

---

## 14. Acceptance Criteria (Definition of Done)

A user can:
1. Send a **text** message in English, Pidgin, or Yoruba describing a sale → receive a correctly populated **invoice or receipt** in Telegram within 4 seconds.
2. Send a **voice note** in any of the three languages describing the same → receive the same document within 12 seconds.
3. Have the extracted JSON forwarded to the backend with a valid signature and `Idempotency-Key`, with `2xx` from the backend (or a surfaced retry failure).
4. Correct a mistake (`"change the qty to 5"`) and receive an updated document with a new document number.

---

## 15. Open Questions / Future Work

- Support Hausa and Igbo (next-language priority).
- Buyer self-service (buyer replies "paid" to mark invoice settled).
- Multi-trader tenanting with per-trader templates and branding.
- Voice-note speaker diarization (separate trader vs. buyer when both speak).
