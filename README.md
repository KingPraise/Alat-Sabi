# ALAT Sabi 🚀
> **AI-Powered Voice-to-Ledger & MSME Cashflow Underwriting Engine**  
> *Built for Wema Bank Hackaholics 7.0 Hackathon*

---

## 📁 Monorepo Structure

```
Alat-Sabi/
├── backend/                  # Node.js + Express + TypeScript Underwriting API (Render)
│   ├── src/                  # Controllers, Services, DB connection, Types & Routing
│   ├── package.json          # Backend dependencies & build/start scripts
│   ├── tsconfig.json         # TypeScript configuration
│   ├── .env.example          # Environment template
│   └── README.md             # Backend API specs & documentation
├── frontend/                 # Next.js PWA Client Dashboard (Vercel)
│   └── .gitkeep              # Placeholder for Next.js workspace
├── README.md                 # Root Monorepo documentation
└── .gitignore                # Global git ignore configuration
```

---

## 📌 Overview
Informal market traders across Nigeria (e.g., Balogun Market fabric sellers, Computer Village electronics vendors, Mile 12 agricultural dealers) process millions of Naira daily, but track sales in their heads or paper notebooks. Because they lack formal financial records, they are cut off from traditional Wema Bank MSME loans.

**ALAT Sabi** bridges this gap:
1. **AI Voice-to-Ledger**: Traders record daily sales using simple voice notes in Pidgin/English/Yoruba (parsed via Google Gemini 1.5/2.0 Flash or webhook).
2. **Web Audio Upload Fallback**: PWA client can upload raw recorded audio (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`) directly to `/api/v1/ledger/voice-upload`.
3. **Auto-Generated Wema Virtual Accounts**: New merchants receive a 10-digit Wema Virtual Account for payment collection.
4. **Automated Credit Underwriting**: Evaluates turnover velocity, daily volume, liquidity ratios, and debt recovery rates to generate real-time credit scores (300–850) and approved loan drawdown limits.
5. **Debtor Collection & WhatsApp Automation**: Automatically tracks credit buyers and generates formatted WhatsApp click-to-chat links with payment details.
6. **Wema Admin Underwriter Leaderboard**: Gives bank credit officers real-time visibility into MSME cashflows and loan default risks.

---

## ⚡ Backend Quick Start (`backend/`)

### 1. Installation
```bash
cd backend
npm install
```

### 2. Environment Setup
Create `backend/.env` from `.env.example`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/alatsabi
GEMINI_API_KEY=your-gemini-api-key-here
```
*Note: If `DATABASE_URL` is omitted, the backend engine runs using an in-memory database with pre-seeded Nigerian market merchant data. If `GEMINI_API_KEY` is omitted, the voice upload parser uses a mock AI fallback for instant sandbox testing.*

### 3. Build & Run
```bash
# Build TypeScript to dist/
npm run build

# Start production backend server
npm start

# Run dev mode with hot reload
npm run dev
```

---

## 📑 Core API Endpoints (`/api/v1`)

### 1. `POST /api/v1/ledger/voice-upload` (Web Audio File Upload & Gemini AI Extraction)
Ingests multipart raw audio notes (`audio/wav`, `audio/webm`, `audio/mp3`, `audio/m4a`, `audio/ogg`), transcribes via Google Gemini AI, logs transaction, updates credit score, and returns structured receipt.

```bash
curl -X POST https://alat-sabi-api.onrender.com/api/v1/ledger/voice-upload \
  -F "phone_number=08031234567" \
  -F "business_name=Mama Chukwudi Lace & Fabrics" \
  -F "audio=@sample_sales.wav"
```

---

### 2. `POST /api/v1/ledger/entry` (AI Voice Webhook Ingestion)
```bash
curl -X POST http://localhost:5000/api/v1/ledger/entry \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "08031234567",
    "business_name": "Mama Chukwudi Lace & Fabrics",
    "raw_transcript": "I sell 2 yards of Swiss Lace 50k cash and 1 Gele 10k credit to Madam Ngozi",
    "items": [
      { "name": "Swiss Voile Lace", "qty": 2, "unit_price": 25000, "total": 50000 },
      { "name": "Aso-Ebi Gele", "qty": 1, "unit_price": 10000, "total": 10000 }
    ],
    "total_amount": 60000,
    "amount_paid": 50000,
    "debt_amount": 10000,
    "debtor_name": "Madam Ngozi",
    "payment_method": "split"
  }'
```

---

### 3. `GET /api/v1/merchant/dashboard/:phone_number`
```bash
curl http://localhost:5000/api/v1/merchant/dashboard/08031234567
```

---

### 4. `GET /api/v1/debtors/:phone_number`
```bash
curl http://localhost:5000/api/v1/debtors/08031234567
```

---

### 5. `POST /api/v1/debtors/settle`
```bash
curl -X POST http://localhost:5000/api/v1/debtors/settle \
  -H "Content-Type: application/json" \
  -d '{ "debtor_id": "d1010000-1111-4111-a111-111111111111", "amount_paid": 5000 }'
```

---

### 6. `POST /api/v1/loans/apply`
```bash
curl -X POST http://localhost:5000/api/v1/loans/apply \
  -H "Content-Type: application/json" \
  -d '{ "phone_number": "08031234567", "requested_amount": 50000 }'
```

---

### 7. `GET /api/v1/wema/admin/underwrite`
```bash
curl http://localhost:5000/api/v1/wema/admin/underwrite
```

---

## ☁️ Independent Deployment Instructions

### 🚀 Backend Deployment on Render
1. Create a new **Web Service** on Render and connect repository `KingPraise/Alat-Sabi`.
2. Set **Root Directory** to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start` (runs `node dist/server.js`)
5. Add Environment Variables:
   - `PORT`: `5000`
   - `DATABASE_URL`: Your Supabase / PostgreSQL URI (Optional)
   - `GEMINI_API_KEY`: Your Google Gemini API Key

### 🎨 Frontend Deployment on Vercel
1. Import repository `KingPraise/Alat-Sabi` into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Next.js**.
4. Build & Output settings: Default (`npm run build`).
5. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://your-render-backend-url.onrender.com/api/v1`
