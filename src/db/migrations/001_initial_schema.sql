-- SQL Schema Migration for ALAT Sabi Backend (PostgreSQL / Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    wema_virtual_account VARCHAR(10) NOT NULL,
    wema_account_name VARCHAR(255) NOT NULL,
    credit_score INT DEFAULT 300 CHECK (credit_score BETWEEN 300 AND 850),
    approved_credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    debt_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'credit', 'split')),
    raw_transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Debtors Table
CREATE TABLE IF NOT EXISTS debtors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    debtor_name VARCHAR(255) NOT NULL,
    debtor_phone VARCHAR(20),
    total_owed NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'settled')),
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    loan_amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 9.00,
    repayment_split_pct NUMERIC(5, 2) DEFAULT 5.00,
    amount_repaid NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'defaulted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid lookup
CREATE INDEX IF NOT EXISTS idx_merchants_phone ON merchants(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_debtors_merchant ON debtors(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loans_merchant ON loans(merchant_id);
