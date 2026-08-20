# ALAT Sabi — AI Voice-to-Ledger & Cashflow Underwriting Engine

> Voice-first conversational accounting and real-time cashflow underwriting for informal Nigerian MSMEs.  
> *Built for Wema Bank Hackaholics 7.0 Hackathon*

[![Live Frontend (Vercel)](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://alat-sabi.vercel.app)
[![Live Backend (Render)](https://img.shields.io/badge/Backend-Render-blue?style=flat-square&logo=render)](https://alat-sabi-api.onrender.com)
[![API Health Check](https://img.shields.io/badge/Health%20Check-Passing-emerald?style=flat-square)](https://alat-sabi-api.onrender.com/health)
[![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.35-black?style=flat-square&logo=next.js)](https://nextjs.org)

---

### 🌐 Live Production Deployment
- **Live PWA Frontend (Vercel):** [https://alat-sabi.vercel.app](https://alat-sabi.vercel.app)
- **Live Backend API (Render):** [https://alat-sabi-api.onrender.com](https://alat-sabi-api.onrender.com)
- **API Health Check:** [https://alat-sabi-api.onrender.com/health](https://alat-sabi-api.onrender.com/health)
- **Demo Video Walkthrough (Loom):** [Watch 3-Min Product Demo Video](https://www.loom.com/share/alat-sabi-hackaholics-demo)

---

### 📌 The Problem & Wema Bank Opportunity
Over ₦30M+ in daily informal trade across Nigerian open markets (Balogun, Computer Village, Mile 12) goes unrecorded. Traders keep mental notes or paper ledgers, locking them out of formal banking. 
**ALAT Sabi** bridges this gap by turning unstructured speech (Pidgin, English, Yoruba) into structured ledgers, provisioning dynamic Wema Virtual Accounts, and calculating cashflow metrics (ADV, Liquidity Ratio) to power pre-approved working capital loans.

---

### 🚀 Core Architecture
1. **Voice Capture Layer:** WhatsApp Webhook & In-Browser Audio Recorder using Google Gemini 1.5 Flash multimodal transcription.
2. **Ledger & Settlement Engine:** Express + TypeScript backend tracking multi-item sales, partial payments, and debtor books.
3. **Credit Scoring Algorithm:**
   - **Average Daily Volume (ADV):** $\text{ADV} = \frac{\text{Total Settled Sales}}{\max(1, \text{Active Days})}$
   - **Liquidity Ratio (LR):** $\text{LR} = \frac{\text{Cash Payments} + \text{Transfer Settlements}}{\text{Total Sales Volume}}$
   - **Approved Credit Limit:** $\text{Approved Limit} = \max\left(0, (\text{ADV} \times 7) \times \text{LR} - \text{Active Loan Balances}\right)$
   - **Credit Score:** 300 to 850 scale mapped from turnover velocity, transaction frequency, liquidity ratio, and repayment track record.
4. **Wema Underwriter Portal:** Real-time risk leaderboard for credit officers.

---

### 🛠️ Interactive API Reference
- `POST /api/v1/ledger/entry`: Direct webhook ingestion for structured voice data.
- `POST /api/v1/ledger/voice-upload`: Multipart audio file ingestion via Gemini AI (`.wav`, `.webm`, `.mp3`, `.m4a`).
- `GET /api/v1/merchant/dashboard/:phone_number`: Merchant turnover, virtual account, and credit status.
- `GET /api/v1/debtors/:phone_number`: Active debtor list with 1-tap WhatsApp reminder links (`https://wa.me/...`).
- `POST /api/v1/debtors/settle`: Settle customer debts.
- `POST /api/v1/loans/apply`: Drawdown working capital restock loan.
- `GET /api/v1/wema/admin/underwrite`: Bank credit officer underwriting leaderboard.

---

### 📁 Monorepo Structure
```
Alat-Sabi/
├── backend/                  # Node.js + Express + TypeScript Underwriting API (Render)
│   ├── src/                  # Controllers, Services, DB connection, Types & Routing
│   ├── package.json          # Dependencies & build scripts
│   └── tsconfig.json         # TypeScript configuration
├── frontend/                 # Next.js 14 PWA Client Dashboard (Vercel)
│   ├── src/                  # App Router pages (Dashboard, Debts, Admin Portal)
│   └── package.json          # Next.js 14.2.35 & Tailwind CSS setup
├── .github/workflows/        # Automated keep-alive workflow for Render backend
└── README.md                 # Complete hackathon documentation
```
