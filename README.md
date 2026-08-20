# ALAT Sabi 🚀
> **AI-Powered Voice-to-Ledger & Cashflow Underwriting Engine for Informal MSMEs**  
> *Built for Wema Bank Hackaholics 7.0 Hackathon*

[![Deploy to Render](https://img.shields.io/badge/Backend-Render-blue?style=flat-square&logo=render)](https://alat-sabi-api.onrender.com)
[![Deploy to Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://alat-sabi.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

---

## 📌 1. Project Overview & Live Links

### **Tagline**
Empowering 40M+ informal Nigerian market traders to record sales by simply speaking in Pidgin, English, or Yoruba — unlocking automated Wema Virtual Accounts, credit scoring, and 9% working capital micro-loans.

### 🌐 Live Links
- **Backend API Endpoint (Render)**: [https://alat-sabi-api.onrender.com](https://alat-sabi-api.onrender.com)
- **Frontend PWA Client Dashboard (Vercel)**: [https://alat-sabi.vercel.app](https://alat-sabi.vercel.app) *(Deploying Next.js PWA client)*
- **Loom Walkthrough Demo**: [Watch 3-Min Product Demo](https://www.loom.com/share/alat-sabi-hackaholics-demo)

---

## 💡 2. Problem Statement & Value to Wema Bank

### **The Informal Sector Challenge**
Over **80% of Nigerian commerce** happens in informal open-air markets like Balogun, Alaba International, Computer Village, and Mile 12. Traders process millions of Naira daily, but track transactions in paper notebooks or in their heads. 
- **Zero Credit Visibility**: Traditional credit scoring models reject these traders due to lack of bank statement history.
- **Lost Float Revenue**: Wema Bank loses out on daily merchant deposit float and payment processing volume.

### **The ALAT Sabi Solution & Bank ROI**
1. **Zero-Friction Voice Onboarding**: Traders speak short voice notes in Nigerian Pidgin or local dialects. Google Gemini 1.5 Multimodal AI converts raw audio into structured double-entry ledger items.
2. **Instant Wema Virtual Accounts**: Every onboarded merchant automatically receives a dedicated 10-digit **Wema Virtual Account** (`78XXXXXXXX`), capturing cash/transfer collections directly into Wema Bank.
3. **Automated MSME Cashflow Underwriting**: Our engine analyzes daily sales velocity, cash-to-credit ratios, and debtor settlement speeds to issue instant working capital loans (9% interest rate with 5% daily auto-deduction).
4. **Debtor Collection Automation**: Formats automated WhatsApp click-to-chat debt reminder links with embedded Wema Virtual Account payment details.

---

## 🏗 3. Architecture & Tech Stack

```
                               ┌────────────────────────────────────────┐
                               │        Informal Market Trader          │
                               │  (Balogun / Computer Village / Mile12) │
                               └──────────────────┬─────────────────────┘
                                                  │
                                   ┌──────────────┴──────────────┐
                                   ▼                             ▼
                        ┌────────────────────┐        ┌────────────────────┐
                        │  WhatsApp Webhook  │        │ Next.js PWA Client │
                        │   (Voice Notes)    │        │  (Direct Audio)    │
                        └──────────┬─────────┘        └──────────┬─────────┘
                                   │                             │
                                   └──────────────┬──────────────┘
                                                  │
                                                  ▼
                                ┌──────────────────────────────────┐
                                │      Express API (Render)        │
                                │   `/ledger/voice-upload`         │
                                └─────────────────┬────────────────┘
                                                  │
                                                  ▼
                                ┌──────────────────────────────────┐
                                │    Google Gemini 1.5 Flash       │
                                │ (Pidgin/Yoruba/English Parser)   │
                                └─────────────────┬────────────────┘
                                                  │
                                                  ▼
                                ┌──────────────────────────────────┐
                                │  Wema Credit Underwriting Engine │
                                │   (ADV + Liquidity Ratio Math)   │
                                └─────────────────┬────────────────┘
                                                  │
                                                  ▼
                                ┌──────────────────────────────────┐
                                │  PostgreSQL Database (Supabase)  │
                                │ (Merchants/Txns/Debtors/Loans)   │
                                └──────────────────────────────────┘
```

### **Tech Stack**
- **Backend Runtime**: Node.js v20 & TypeScript
- **Framework**: Express.js with Zod schema validation
- **AI Processing**: Google Gemini 1.5 Flash (Multimodal Audio Transcription & JSON Extraction)
- **Database**: PostgreSQL (pg pool) / Supabase DDL with automatic **In-Memory Storage Fallback** for instant sandbox environments
- **Deployment**: Render (Backend API), Vercel (Frontend PWA)

---

## 🧮 4. Wema Credit Scoring Algorithm

Implemented in `src/services/scoring.service.ts`:

### **1. Average Daily Volume (ADV)**
$$\text{ADV} = \frac{\text{Total Paid / Settled Sales}}{\max(1, \text{Active Span Days})}$$

### **2. Liquidity Ratio (LR)**
$$\text{LR} = \frac{\text{Cash Payments} + \text{Transfer Settlements}}{\text{Total Sales Volume}}$$

### **3. Approved Loan Drawdown Limit**
$$\text{Approved Limit} = \max\left(0, (\text{ADV} \times 7) \times \text{LR} - \text{Active Outstanding Loans}\right)$$

### **4. Credit Score Formula (Range: 300 to 850)**
$$\text{Credit Score} = 300 + S_{\text{turnover}} + S_{\text{frequency}} + S_{\text{liquidity}} + S_{\text{debt\_recovery}} - P_{\text{defaults}}$$

Where:
- **Turnover Volume Score ($S_{\text{turnover}}$)**: Up to +200 points ($\frac{\text{Total Sales}}{500,000} \times 200$)
- **Transaction Frequency Score ($S_{\text{frequency}}$)**: Up to +150 points ($\frac{\text{Txn Count}}{30} \times 150$)
- **Liquidity Ratio Score ($S_{\text{liquidity}}$)**: Up to +120 points ($\text{LR} \times 120$)
- **Debt Recovery Rate Score ($S_{\text{debt\_recovery}}$)**: Up to +80 points ($\frac{\text{Collected Debts}}{\text{Total Accrued Debts}} \times 80$)
- **Default Penalty ($P_{\text{defaults}}$)**: -150 points per defaulted loan

---

## 📡 5. Interactive API Reference (`/api/v1`)

### **1. Audio Note Upload & AI Parsing**
`POST /api/v1/ledger/voice-upload` (Multipart Form-Data)

#### **cURL Command**:
```bash
curl -X POST https://alat-sabi-api.onrender.com/api/v1/ledger/voice-upload \
  -F "phone_number=08031234567" \
  -F "business_name=Mama Chukwudi Lace & Fabrics" \
  -F "audio=@sample_sales.wav"
```

#### **JSON Response (201 Created)**:
```json
{
  "status": "success",
  "message": "Transaction successfully processed and voice note ledgered",
  "receipt": {
    "receipt_id": "923cbb0a-f798-4d8d-8412-6094199c4e17",
    "business_name": "Mama Chukwudi Lace & Fabrics",
    "merchant_phone": "08031234567",
    "wema_virtual_account": "7810293841",
    "items": [
      { "name": "Swiss Voile Lace", "qty": 2, "unit_price": 25000, "total": 50000 },
      { "name": "Aso-Ebi Gele", "qty": 1, "unit_price": 10000, "total": 10000 }
    ],
    "total_amount": 60000,
    "amount_paid": 50000,
    "debt_amount": 10000,
    "debtor_name": "Madam Ngozi",
    "payment_method": "split",
    "timestamp": "2026-08-20T06:59:00.498Z"
  },
  "merchant_underwriting": {
    "updated_credit_score": 563,
    "approved_credit_limit": 439782.61,
    "adv": 70000,
    "liquidity_ratio": 0.83
  }
}
```

---

### **2. Webhook Ingestion (JSON Payload)**
`POST /api/v1/ledger/entry`

#### **cURL Command**:
```bash
curl -X POST https://alat-sabi-api.onrender.com/api/v1/ledger/entry \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "08059876543",
    "business_name": "Ifeanyi Tech Gadgets",
    "raw_transcript": "Sold 1 UK Used iPhone 12 Pro for 280k transfer",
    "items": [{"name": "UK Used iPhone 12 Pro", "qty": 1, "unit_price": 280000, "total": 280000}],
    "total_amount": 280000,
    "amount_paid": 280000,
    "debt_amount": 0,
    "payment_method": "transfer"
  }'
```

---

### **3. Merchant Dashboard Aggregation**
`GET /api/v1/merchant/dashboard/:phone_number`

#### **cURL Command**:
```bash
curl https://alat-sabi-api.onrender.com/api/v1/merchant/dashboard/08031234567
```

#### **JSON Response**:
```json
{
  "status": "success",
  "merchant_profile": {
    "id": "11111111-1111-4111-a111-111111111111",
    "phone_number": "08031234567",
    "business_name": "Mama Chukwudi Lace & Fabrics (Balogun Market)",
    "wema_virtual_account": "7810293841",
    "wema_account_name": "ALAT SABI / MAMA CHUKWUDI LACE",
    "credit_score": 720,
    "approved_credit_limit": 350000.00
  },
  "today_summary": {
    "total_sales": 90000,
    "cash_collected": 70000,
    "unpaid_debts": 20000,
    "transaction_count": 2
  },
  "active_debtors": [
    {
      "id": "d1010000-1111-4111-a111-111111111111",
      "debtor_name": "Nkechi Customer",
      "total_owed": 20000,
      "status": "unpaid"
    }
  ]
}
```

---

### **4. Active Debtors & WhatsApp Reminders**
`GET /api/v1/debtors/:phone_number`

#### **cURL Command**:
```bash
curl https://alat-sabi-api.onrender.com/api/v1/debtors/08031234567
```

#### **JSON Response**:
```json
{
  "status": "success",
  "merchant_business_name": "Mama Chukwudi Lace & Fabrics",
  "total_active_debtors": 1,
  "total_outstanding_owed": 20000,
  "debtors": [
    {
      "id": "d1010000-1111-4111-a111-111111111111",
      "debtor_name": "Nkechi Customer",
      "debtor_phone": "08099887766",
      "total_owed": 20000,
      "status": "unpaid",
      "whatsapp_reminder_link": "https://wa.me/08099887766?text=Hello%20Nkechi%20Customer%2C%20this%20is%20a%20friendly%20reminder%20from%20Mama%20Chukwudi%20Lace%20%26%20Fabrics.%20You%20have%20an%20outstanding%20balance%20of%20%E2%82%A620%2C000%20for%20recent%20purchases.%20Kindly%20make%20payment%20to%20our%20Wema%20Virtual%20Account%3A%207810293841%20(ALAT%20SABI%20%2F%20MAMA%20CHUKWUDI%20LACE).%20Thank%20you!"
    }
  ]
}
```

---

### **5. Settle Debtor Debt**
`POST /api/v1/debtors/settle`

#### **cURL Command**:
```bash
curl -X POST https://alat-sabi-api.onrender.com/api/v1/debtors/settle \
  -H "Content-Type: application/json" \
  -d '{
    "debtor_id": "d1010000-1111-4111-a111-111111111111",
    "amount_paid": 5000
  }'
```

---

### **6. Loan Drawdown Request**
`POST /api/v1/loans/apply`

#### **cURL Command**:
```bash
curl -X POST https://alat-sabi-api.onrender.com/api/v1/loans/apply \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "08031234567",
    "requested_amount": 50000
  }'
```

#### **JSON Response**:
```json
{
  "status": "success",
  "message": "Wema MSME Working Capital loan successfully disbursed!",
  "loan": {
    "loan_id": "l90281-2291",
    "disbursed_amount": 50000,
    "interest_rate_pct": "9%",
    "repayment_split_pct": "5% daily sales deduction",
    "status": "active"
  },
  "remaining_credit_limit": 300000
}
```

---

### **7. Wema Bank Admin Underwriter Leaderboard**
`GET /api/v1/wema/admin/underwrite`

#### **cURL Command**:
```bash
curl https://alat-sabi-api.onrender.com/api/v1/wema/admin/underwrite
```

#### **JSON Response**:
```json
{
  "status": "success",
  "bank_summary": {
    "total_merchants_onboarded": 3,
    "total_credit_portfolio_disbursed": 150000,
    "risk_breakdown": {
      "low_risk": 1,
      "medium_risk": 1,
      "high_risk": 1
    }
  },
  "underwriting_leaderboard": [
    {
      "merchant_id": "33333333-3333-4333-a333-333333333333",
      "business_name": "Alhaji Tanko Tomatoes & Onions (Mile 12 Market)",
      "phone_number": "08021112233",
      "wema_virtual_account": "7855443322",
      "credit_score": 780,
      "approved_credit_limit": 520000,
      "adv": 550000,
      "liquidity_ratio": 1,
      "risk_level": "LOW"
    }
  ]
}
```

---

## 🛠 6. Monorepo Setup & Local Development

### **Structure**
- `backend/`: Node.js + Express + TypeScript underwriting API (deployed on Render).
- `frontend/`: Next.js PWA client workspace (deployed on Vercel).

### **Run Backend Locally**
```bash
cd backend
npm install
npm run build
npm start
```
The server will start at `http://localhost:5000` pre-loaded with realistic Nigerian market test data!
