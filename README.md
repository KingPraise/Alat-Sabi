# ALAT Sabi Engine 🚀
> **AI-Powered Voice-to-Ledger & MSME Cashflow Underwriting Engine**  
> *Built for Wema Bank Hackaholics 7.0 Hackathon*

---

## 📌 Overview
Informal market traders across Nigeria (e.g., Balogun Market fabric sellers, Computer Village electronics vendors, Mile 12 agricultural dealers) process millions of Naira daily, but track sales in their heads or paper notebooks. Because they lack formal financial records, they are cut off from traditional Wema Bank MSME loans.

**ALAT Sabi** bridges this gap:
1. **AI Voice-to-Ledger**: Traders record daily sales using simple voice notes in Pidgin/English. The external voice pipeline parses these notes into structured JSON transactions.
2. **Auto-Generated Wema Virtual Accounts**: New merchants receive a 10-digit Wema Virtual Account for payment collection.
3. **Automated Credit Underwriting**: Evaluates turnover velocity, daily volume, liquidity ratios, and debt recovery rates to generate real-time credit scores (300–850) and approved loan drawdown limits.
4. **Debtor Collection & WhatsApp Automation**: Automatically tracks credit buyers and generates formatted WhatsApp click-to-chat links with payment details.
5. **Wema Admin Underwriter Leaderboard**: Gives bank credit officers real-time visibility into MSME cashflows and loan default risks.

---

## 🏗 Tech Stack & Architecture
- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js with Zod validation
- **Database**: PostgreSQL (pg pool) / Supabase DDL with automatic **In-Memory Fallback** for instant sandbox execution without DB setup.
- **Middleware**: CORS, dotenv, global error handler

---

## ⚙️ Quick Start

### 1. Installation
```bash
git clone https://github.com/KingPraise/Alat-Sabi.git
cd Alat-Sabi
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/alatsabi
```
*Note: If `DATABASE_URL` is omitted, the engine runs seamlessly using an in-memory database with pre-seeded Nigerian market merchants.*

### 3. Build & Run
```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Run development mode with hot reload
npm run dev
```

---

## 📑 API Endpoints & Contracts (`/api/v1`)

### 1. `POST /api/v1/ledger/entry` (AI Voice Webhook Ingestion)
Ingests parsed voice notes, auto-onboards new merchants with a Wema Virtual Account, records items/debt, and recalculates the credit score.

**Sample Request Body**:
```json
{
  "phone_number": "08031234567",
  "business_name": "Mama Chukwudi Lace & Fabrics (Balogun Market)",
  "raw_transcript": "I sell 2 yards of Swiss Voile Lace for 50k cash and 1 Gele for 10k credit to Madam Ngozi",
  "items": [
    { "name": "Swiss Voile Lace", "qty": 2, "unit_price": 25000, "total": 50000 },
    { "name": "Aso-Ebi Gele", "qty": 1, "unit_price": 10000, "total": 10000 }
  ],
  "total_amount": 60000,
  "amount_paid": 50000,
  "debt_amount": 10000,
  "debtor_name": "Madam Ngozi",
  "payment_method": "split"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:5000/api/v1/ledger/entry \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "08031234567",
    "items": [{"name": "Lace Fabric", "qty": 1, "unit_price": 20000, "total": 20000}],
    "total_amount": 20000,
    "amount_paid": 20000,
    "debt_amount": 0,
    "payment_method": "cash"
  }'
```

---

### 2. `GET /api/v1/merchant/dashboard/:phone_number`
Returns aggregated daily sales summary, Wema virtual account info, active debtors, and active loan status.

**cURL Example**:
```bash
curl http://localhost:5000/api/v1/merchant/dashboard/08031234567
```

---

### 3. `GET /api/v1/debtors/:phone_number`
Returns list of active debtors with pre-formatted WhatsApp click-to-chat reminder links (`https://wa.me/...`).

**cURL Example**:
```bash
curl http://localhost:5000/api/v1/debtors/08031234567
```

---

### 4. `POST /api/v1/debtors/settle`
Deducts paid balance from debtor record or marks status as `settled`.

**Sample Request Body**:
```json
{
  "debtor_id": "d1010000-1111-4111-a111-111111111111",
  "amount_paid": 5000
}
```

---

### 5. `POST /api/v1/loans/apply`
Allows merchants to draw down working capital against their approved credit limit.

**Sample Request Body**:
```json
{
  "phone_number": "08031234567",
  "requested_amount": 50000
}
```

---

### 6. `GET /api/v1/wema/admin/underwrite`
Leaderboard dashboard for Wema Bank credit underwriters ranking merchants by credit score, turnover velocity, and default risk.

**cURL Example**:
```bash
curl http://localhost:5000/api/v1/wema/admin/underwrite
```

---

## 🧮 Wema Credit Scoring Engine Formula
Implemented in `src/services/scoring.service.ts`:
1. **Average Daily Volume (ADV)**:
   $$\text{ADV} = \frac{\text{Total Settled Sales}}{\max(1, \text{Active Days})}$$
2. **Liquidity Ratio (LR)**:
   $$\text{LR} = \frac{\text{Cash Payments} + \text{Transfer Settlements}}{\text{Total Sales}}$$
3. **Approved Loan Limit**:
   $$\text{Approved Loan Limit} = (\text{ADV} \times 7) \times \text{LR} - \text{Active Loan Balance}$$
4. **Credit Score Mapping (300 to 850)**:
   - **Turnover Volume**: Up to +200 points
   - **Transaction Consistency & Frequency**: Up to +150 points
   - **Liquidity & Cash Settlement Ratio**: Up to +120 points
   - **Debt Collection Rate**: Up to +80 points
   - **Default Penalty**: -150 points per defaulted loan

---

## ☁️ Deployment Instructions

### Deploy to Render
1. Connect your GitHub repository to Render.
2. Select **Web Service**.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add Environment Variable: `DATABASE_URL` (optional, pointing to Supabase PostgreSQL).

### Deploy to Vercel
1. Install Vercel CLI or import repository in Vercel Dashboard.
2. Set Build Command: `npm run build`
3. Output Directory: `dist`
4. Deploy using Node.js runtime.
