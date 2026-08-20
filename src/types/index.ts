export interface Item {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Merchant {
  id: string;
  phone_number: string;
  business_name: string;
  wema_virtual_account: string;
  wema_account_name: string;
  credit_score: number;
  approved_credit_limit: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  items: Item[];
  total_amount: number;
  amount_paid: number;
  debt_amount: number;
  payment_method: 'cash' | 'transfer' | 'credit' | 'split';
  raw_transcript?: string;
  created_at: string;
}

export interface Debtor {
  id: string;
  merchant_id: string;
  debtor_name: string;
  debtor_phone?: string | null;
  total_owed: number;
  status: 'unpaid' | 'partially_paid' | 'settled';
  last_reminder_sent?: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  merchant_id: string;
  loan_amount: number;
  interest_rate: number;
  repayment_split_pct: number;
  amount_repaid: number;
  status: 'active' | 'settled' | 'defaulted';
  created_at: string;
}
