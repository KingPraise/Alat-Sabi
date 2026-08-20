import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Merchant, Transaction, Debtor, Loan } from '../types';

/**
 * Database client interface providing unified database operations for PostgreSQL/Supabase
 * with built-in fast in-memory fallback for local development or sandbox environments.
 */
class DatabaseService {
  private pool: Pool | null = null;
  private isConnectedToPg = false;

  // In-memory tables for fallback execution
  private merchants: Map<string, Merchant> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private debtors: Map<string, Debtor> = new Map();
  private loans: Map<string, Loan> = new Map();

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;
    if (connectionString && !connectionString.includes('localhost:5432')) {
      try {
        this.pool = new Pool({
          connectionString,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
      } catch (err) {
        console.warn('⚠️ PostgreSQL connection setup failed. Falling back to in-memory database.', err);
      }
    }
  }

  public async init(): Promise<void> {
    if (this.pool) {
      try {
        const client = await this.pool.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS merchants (
              id UUID PRIMARY KEY,
              phone_number VARCHAR(20) UNIQUE NOT NULL,
              business_name VARCHAR(255) NOT NULL,
              wema_virtual_account VARCHAR(10) NOT NULL,
              wema_account_name VARCHAR(255) NOT NULL,
              credit_score INT DEFAULT 300,
              approved_credit_limit NUMERIC(15, 2) DEFAULT 0.00,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS transactions (
              id UUID PRIMARY KEY,
              merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
              items JSONB NOT NULL DEFAULT '[]'::jsonb,
              total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
              amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
              debt_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
              payment_method VARCHAR(20) NOT NULL,
              raw_transcript TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS debtors (
              id UUID PRIMARY KEY,
              merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
              debtor_name VARCHAR(255) NOT NULL,
              debtor_phone VARCHAR(20),
              total_owed NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
              status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
              last_reminder_sent TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS loans (
              id UUID PRIMARY KEY,
              merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
              loan_amount NUMERIC(15, 2) NOT NULL,
              interest_rate NUMERIC(5, 2) DEFAULT 9.00,
              repayment_split_pct NUMERIC(5, 2) DEFAULT 5.00,
              amount_repaid NUMERIC(15, 2) DEFAULT 0.00,
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        client.release();
        this.isConnectedToPg = true;
        console.log('✅ Connected to PostgreSQL database');
      } catch (err) {
        console.warn('⚠️ Could not connect to PostgreSQL server. Operating in-memory mode.', (err as Error).message);
        this.isConnectedToPg = false;
      }
    } else {
      console.log('ℹ️ Operating in-memory storage mode (No external DB configured)');
    }
  }

  // --- MERCHANTS ---
  public async getMerchantByPhone(phone: string): Promise<Merchant | null> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query('SELECT * FROM merchants WHERE phone_number = $1', [phone]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        credit_score: Number(r.credit_score),
        approved_credit_limit: Number(r.approved_credit_limit),
      };
    }
    for (const m of this.merchants.values()) {
      if (m.phone_number === phone) return m;
    }
    return null;
  }

  public async getMerchantById(id: string): Promise<Merchant | null> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query('SELECT * FROM merchants WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        credit_score: Number(r.credit_score),
        approved_credit_limit: Number(r.approved_credit_limit),
      };
    }
    return this.merchants.get(id) || null;
  }

  public async getAllMerchants(): Promise<Merchant[]> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query('SELECT * FROM merchants ORDER BY created_at DESC');
      return res.rows.map((r) => ({
        ...r,
        credit_score: Number(r.credit_score),
        approved_credit_limit: Number(r.approved_credit_limit),
      }));
    }
    return Array.from(this.merchants.values());
  }

  public async upsertMerchant(merchant: Partial<Merchant> & { phone_number: string }): Promise<Merchant> {
    let existing = await this.getMerchantByPhone(merchant.phone_number);

    if (existing) {
      const updated: Merchant = {
        ...existing,
        business_name: merchant.business_name || existing.business_name,
        credit_score: merchant.credit_score !== undefined ? merchant.credit_score : existing.credit_score,
        approved_credit_limit: merchant.approved_credit_limit !== undefined ? merchant.approved_credit_limit : existing.approved_credit_limit,
      };

      if (this.isConnectedToPg && this.pool) {
        await this.pool.query(
          `UPDATE merchants SET business_name = $1, credit_score = $2, approved_credit_limit = $3 WHERE id = $4`,
          [updated.business_name, updated.credit_score, updated.approved_credit_limit, updated.id]
        );
      } else {
        this.merchants.set(updated.id, updated);
      }
      return updated;
    } else {
      // Auto generate 10-digit Wema Virtual Account starting with '78'
      const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
      const virtualAcc = `78${randomSuffix}`.substring(0, 10);
      const bizName = merchant.business_name || `Merchant ${merchant.phone_number.slice(-4)}`;

      const newMerchant: Merchant = {
        id: merchant.id || uuidv4(),
        phone_number: merchant.phone_number,
        business_name: bizName,
        wema_virtual_account: virtualAcc,
        wema_account_name: `ALAT SABI / ${bizName.toUpperCase()}`,
        credit_score: merchant.credit_score !== undefined ? merchant.credit_score : 300,
        approved_credit_limit: merchant.approved_credit_limit !== undefined ? merchant.approved_credit_limit : 0,
        created_at: merchant.created_at || new Date().toISOString(),
      };

      if (this.isConnectedToPg && this.pool) {
        await this.pool.query(
          `INSERT INTO merchants (id, phone_number, business_name, wema_virtual_account, wema_account_name, credit_score, approved_credit_limit, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newMerchant.id,
            newMerchant.phone_number,
            newMerchant.business_name,
            newMerchant.wema_virtual_account,
            newMerchant.wema_account_name,
            newMerchant.credit_score,
            newMerchant.approved_credit_limit,
            newMerchant.created_at,
          ]
        );
      } else {
        this.merchants.set(newMerchant.id, newMerchant);
      }
      return newMerchant;
    }
  }

  // --- TRANSACTIONS ---
  public async addTransaction(txn: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const newTxn: Transaction = {
      ...txn,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    if (this.isConnectedToPg && this.pool) {
      await this.pool.query(
        `INSERT INTO transactions (id, merchant_id, items, total_amount, amount_paid, debt_amount, payment_method, raw_transcript, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newTxn.id,
          newTxn.merchant_id,
          JSON.stringify(newTxn.items),
          newTxn.total_amount,
          newTxn.amount_paid,
          newTxn.debt_amount,
          newTxn.payment_method,
          newTxn.raw_transcript || null,
          newTxn.created_at,
        ]
      );
    } else {
      this.transactions.set(newTxn.id, newTxn);
    }
    return newTxn;
  }

  public async getTransactionsByMerchant(merchantId: string): Promise<Transaction[]> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM transactions WHERE merchant_id = $1 ORDER BY created_at DESC`,
        [merchantId]
      );
      return res.rows.map((r) => ({
        ...r,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
        total_amount: Number(r.total_amount),
        amount_paid: Number(r.amount_paid),
        debt_amount: Number(r.debt_amount),
      }));
    }
    return Array.from(this.transactions.values())
      .filter((t) => t.merchant_id === merchantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- DEBTORS ---
  public async upsertDebtor(merchantId: string, debtorName: string, debtAmount: number, debtorPhone?: string): Promise<Debtor> {
    let existingDebtor: Debtor | null = null;

    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM debtors WHERE merchant_id = $1 AND LOWER(debtor_name) = LOWER($2)`,
        [merchantId, debtorName]
      );
      if (res.rows.length > 0) {
        existingDebtor = {
          ...res.rows[0],
          total_owed: Number(res.rows[0].total_owed),
        };
      }
    } else {
      for (const d of this.debtors.values()) {
        if (d.merchant_id === merchantId && d.debtor_name.toLowerCase() === debtorName.toLowerCase()) {
          existingDebtor = d;
          break;
        }
      }
    }

    if (existingDebtor) {
      const newTotal = Number(existingDebtor.total_owed) + debtAmount;
      const updated: Debtor = {
        ...existingDebtor,
        total_owed: newTotal,
        debtor_phone: debtorPhone || existingDebtor.debtor_phone,
        status: newTotal <= 0 ? 'settled' : 'unpaid',
      };

      if (this.isConnectedToPg && this.pool) {
        await this.pool.query(
          `UPDATE debtors SET total_owed = $1, debtor_phone = $2, status = $3 WHERE id = $4`,
          [updated.total_owed, updated.debtor_phone, updated.status, updated.id]
        );
      } else {
        this.debtors.set(updated.id, updated);
      }
      return updated;
    } else {
      const newDebtor: Debtor = {
        id: uuidv4(),
        merchant_id: merchantId,
        debtor_name: debtorName,
        debtor_phone: debtorPhone || null,
        total_owed: debtAmount,
        status: debtAmount <= 0 ? 'settled' : 'unpaid',
        created_at: new Date().toISOString(),
      };

      if (this.isConnectedToPg && this.pool) {
        await this.pool.query(
          `INSERT INTO debtors (id, merchant_id, debtor_name, debtor_phone, total_owed, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newDebtor.id,
            newDebtor.merchant_id,
            newDebtor.debtor_name,
            newDebtor.debtor_phone,
            newDebtor.total_owed,
            newDebtor.status,
            newDebtor.created_at,
          ]
        );
      } else {
        this.debtors.set(newDebtor.id, newDebtor);
      }
      return newDebtor;
    }
  }

  public async getDebtorsByMerchant(merchantId: string): Promise<Debtor[]> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM debtors WHERE merchant_id = $1 ORDER BY created_at DESC`,
        [merchantId]
      );
      return res.rows.map((r) => ({
        ...r,
        total_owed: Number(r.total_owed),
      }));
    }
    return Array.from(this.debtors.values()).filter((d) => d.merchant_id === merchantId);
  }

  public async getDebtorById(debtorId: string): Promise<Debtor | null> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(`SELECT * FROM debtors WHERE id = $1`, [debtorId]);
      if (res.rows.length === 0) return null;
      return {
        ...res.rows[0],
        total_owed: Number(res.rows[0].total_owed),
      };
    }
    return this.debtors.get(debtorId) || null;
  }

  public async settleDebtor(debtorId: string, amountPaid: number): Promise<Debtor> {
    const debtor = await this.getDebtorById(debtorId);
    if (!debtor) {
      throw new Error('Debtor not found');
    }

    const newTotalOwed = Math.max(0, Number(debtor.total_owed) - amountPaid);
    const newStatus = newTotalOwed === 0 ? 'settled' : 'partially_paid';

    const updated: Debtor = {
      ...debtor,
      total_owed: newTotalOwed,
      status: newStatus,
    };

    if (this.isConnectedToPg && this.pool) {
      await this.pool.query(
        `UPDATE debtors SET total_owed = $1, status = $2 WHERE id = $3`,
        [updated.total_owed, updated.status, updated.id]
      );
    } else {
      this.debtors.set(updated.id, updated);
    }

    return updated;
  }

  // --- LOANS ---
  public async addLoan(loan: Omit<Loan, 'id' | 'created_at'>): Promise<Loan> {
    const newLoan: Loan = {
      ...loan,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    if (this.isConnectedToPg && this.pool) {
      await this.pool.query(
        `INSERT INTO loans (id, merchant_id, loan_amount, interest_rate, repayment_split_pct, amount_repaid, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newLoan.id,
          newLoan.merchant_id,
          newLoan.loan_amount,
          newLoan.interest_rate,
          newLoan.repayment_split_pct,
          newLoan.amount_repaid,
          newLoan.status,
          newLoan.created_at,
        ]
      );
    } else {
      this.loans.set(newLoan.id, newLoan);
    }
    return newLoan;
  }

  public async getLoansByMerchant(merchantId: string): Promise<Loan[]> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM loans WHERE merchant_id = $1 ORDER BY created_at DESC`,
        [merchantId]
      );
      return res.rows.map((r) => ({
        ...r,
        loan_amount: Number(r.loan_amount),
        interest_rate: Number(r.interest_rate),
        repayment_split_pct: Number(r.repayment_split_pct),
        amount_repaid: Number(r.amount_repaid),
      }));
    }
    return Array.from(this.loans.values()).filter((l) => l.merchant_id === merchantId);
  }

  public async getAllLoans(): Promise<Loan[]> {
    if (this.isConnectedToPg && this.pool) {
      const res = await this.pool.query(`SELECT * FROM loans ORDER BY created_at DESC`);
      return res.rows.map((r) => ({
        ...r,
        loan_amount: Number(r.loan_amount),
        interest_rate: Number(r.interest_rate),
        repayment_split_pct: Number(r.repayment_split_pct),
        amount_repaid: Number(r.amount_repaid),
      }));
    }
    return Array.from(this.loans.values());
  }

  // --- SEED UTILITY ---
  public seedDirectly(merchants: Merchant[], txns: Transaction[], debtors: Debtor[], loans: Loan[]): void {
    merchants.forEach((m) => this.merchants.set(m.id, m));
    txns.forEach((t) => this.transactions.set(t.id, t));
    debtors.forEach((d) => this.debtors.set(d.id, d));
    loans.forEach((l) => this.loans.set(l.id, l));
  }
}

export const db = new DatabaseService();
