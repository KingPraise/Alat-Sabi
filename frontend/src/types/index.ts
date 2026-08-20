export interface Item {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface MerchantProfile {
  id: string;
  phone_number: string;
  business_name: string;
  wema_virtual_account: string;
  wema_account_name: string;
  credit_score: number;
  approved_credit_limit: number;
}

export interface TodaySummary {
  total_sales: number;
  cash_collected: number;
  unpaid_debts: number;
  transaction_count: number;
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
  debtor_name: string;
  debtor_phone?: string | null;
  total_owed: number;
  status: 'unpaid' | 'partially_paid' | 'settled';
  created_at: string;
  whatsapp_reminder_link?: string;
}

export interface ActiveLoan {
  id: string;
  loan_amount: number;
  interest_rate: number;
  repayment_split_pct: number;
  amount_repaid: number;
  status: string;
  created_at: string;
}

export interface DashboardResponse {
  status: string;
  merchant_profile: MerchantProfile;
  underwriting_metrics: {
    adv: number;
    liquidity_ratio: number;
  };
  today_summary: TodaySummary;
  recent_transactions: Transaction[];
  active_debtors: Debtor[];
  active_loans: ActiveLoan[];
}

export interface DebtorListResponse {
  status: string;
  merchant_business_name: string;
  total_active_debtors: number;
  total_outstanding_owed: number;
  debtors: Debtor[];
}

export interface AdminUnderwriteMerchant {
  merchant_id: string;
  phone_number: string;
  business_name: string;
  wema_virtual_account: string;
  credit_score: number;
  approved_credit_limit: number;
  adv: number;
  liquidity_ratio: number;
  total_sales_volume: number;
  total_transactions: number;
  total_debt_outstanding: number;
  active_loans: number;
  total_loans_disbursed: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  onboarded_at: string;
}

export interface AdminUnderwriteResponse {
  status: string;
  bank_summary: {
    total_merchants_onboarded: number;
    total_credit_portfolio_disbursed: number;
    risk_breakdown: {
      low_risk: number;
      medium_risk: number;
      high_risk: number;
    };
  };
  underwriting_leaderboard: AdminUnderwriteMerchant[];
}
