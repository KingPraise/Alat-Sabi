import { db } from './connection';
import { Merchant, Transaction, Debtor, Loan } from '../types';
import { ScoringService } from '../services/scoring.service';

/**
 * Seeds the database with 3 realistic Nigerian market merchant profiles:
 * 1. Balogun Market Textile Trader (High volume cash merchant)
 * 2. Computer Village Electronics Vendor (High ticket, mixed payment & loan holder)
 * 3. Mile 12 Agricultural Produce Wholesale Trader (Fast turnover trader)
 */
export async function seedDatabase() {
  console.log('🌱 Seeding database with realistic Nigerian market merchant data...');

  // Merchant 1: Balogun Market Textile Trader
  const m1Id = '11111111-1111-4111-a111-111111111111';
  const m1: Merchant = {
    id: m1Id,
    phone_number: '08031234567',
    business_name: 'Mama Chukwudi Lace & Fabrics (Balogun Market)',
    wema_virtual_account: '7810293841',
    wema_account_name: 'ALAT SABI / MAMA CHUKWUDI LACE',
    credit_score: 720,
    approved_credit_limit: 350000.00,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Merchant 2: Computer Village Electronics Vendor
  const m2Id = '22222222-2222-4222-a222-222222222222';
  const m2: Merchant = {
    id: m2Id,
    phone_number: '08059876543',
    business_name: 'Ifeanyi Tech Gadgets (Computer Village Ikeja)',
    wema_virtual_account: '7894837201',
    wema_account_name: 'ALAT SABI / IFEANYI TECH GADGETS',
    credit_score: 610,
    approved_credit_limit: 180000.00,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Merchant 3: Mile 12 Agricultural Produce Dealer
  const m3Id = '33333333-3333-4333-a333-333333333333';
  const m3: Merchant = {
    id: m3Id,
    phone_number: '08021112233',
    business_name: 'Alhaji Tanko Tomatoes & Onions (Mile 12 Market)',
    wema_virtual_account: '7855443322',
    wema_account_name: 'ALAT SABI / ALHAJI TANKO STORES',
    credit_score: 780,
    approved_credit_limit: 520000.00,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Seed Transactions
  const transactions: Transaction[] = [
    // Mama Chukwudi txns
    {
      id: 't101',
      merchant_id: m1Id,
      items: [{ name: 'Swiss Voile Lace (5 yards)', qty: 2, unit_price: 25000, total: 50000 }],
      total_amount: 50000,
      amount_paid: 50000,
      debt_amount: 0,
      payment_method: 'cash',
      raw_transcript: 'I sell two 5 yards Swiss Voile Lace for 50k cash',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 't102',
      merchant_id: m1Id,
      items: [{ name: 'Aso-Ebi Gele set', qty: 5, unit_price: 8000, total: 40000 }],
      total_amount: 40000,
      amount_paid: 20000,
      debt_amount: 20000,
      payment_method: 'split',
      raw_transcript: 'Nkechi buy 5 Gele set for 40 thousand naira. She pay 20 thousand cash, balance 20k',
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    // Ifeanyi Tech txns
    {
      id: 't201',
      merchant_id: m2Id,
      items: [{ name: 'UK Used iPhone 12 Pro', qty: 1, unit_price: 280000, total: 280000 }],
      total_amount: 280000,
      amount_paid: 280000,
      debt_amount: 0,
      payment_method: 'transfer',
      raw_transcript: 'Sold one UK used iPhone 12 Pro 280k via bank transfer',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: 't202',
      merchant_id: m2Id,
      items: [{ name: 'Oraimo Powerbank 27000mAh', qty: 2, unit_price: 18000, total: 36000 }],
      total_amount: 36000,
      amount_paid: 0,
      debt_amount: 36000,
      payment_method: 'credit',
      raw_transcript: 'Bro Bayo collect 2 Oraimo powerbank 36k, say e go pay on Friday',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    // Alhaji Tanko txns
    {
      id: 't301',
      merchant_id: m3Id,
      items: [
        { name: 'Basket of Jos Tomatoes', qty: 10, unit_price: 35000, total: 350000 },
        { name: 'Bag of Kano Onions', qty: 5, unit_price: 40000, total: 200000 },
      ],
      total_amount: 550000,
      amount_paid: 550000,
      debt_amount: 0,
      payment_method: 'transfer',
      raw_transcript: 'Sold 10 basket Jos tomatoes and 5 bags Kano onions for 550 thousand bank transfer',
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
  ];

  // Seed Debtors
  const debtors: Debtor[] = [
    {
      id: 'd1010000-1111-4111-a111-111111111111',
      merchant_id: m1Id,
      debtor_name: 'Nkechi Customer',
      debtor_phone: '08099887766',
      total_owed: 20000,
      status: 'unpaid',
      last_reminder_sent: null,
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    {
      id: 'd2010000-2222-4222-a222-222222222222',
      merchant_id: m2Id,
      debtor_name: 'Bro Bayo',
      debtor_phone: '08077665544',
      total_owed: 36000,
      status: 'unpaid',
      last_reminder_sent: null,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
  ];

  // Seed Loans
  const loans: Loan[] = [
    {
      id: 'l201',
      merchant_id: m2Id,
      loan_amount: 100000,
      interest_rate: 9.0,
      repayment_split_pct: 5.0,
      amount_repaid: 25000,
      status: 'active',
      created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  // Recalculate merchant scores with initial seed data
  const m1Txns = transactions.filter((t) => t.merchant_id === m1Id);
  const m1Debtors = debtors.filter((d) => d.merchant_id === m1Id);
  const m1Loans = loans.filter((l) => l.merchant_id === m1Id);
  const m1Metrics = ScoringService.calculateCreditMetrics(m1, m1Txns, m1Debtors, m1Loans);
  m1.credit_score = m1Metrics.creditScore;
  m1.approved_credit_limit = m1Metrics.approvedLoanLimit;

  const m2Txns = transactions.filter((t) => t.merchant_id === m2Id);
  const m2Debtors = debtors.filter((d) => d.merchant_id === m2Id);
  const m2Loans = loans.filter((l) => l.merchant_id === m2Id);
  const m2Metrics = ScoringService.calculateCreditMetrics(m2, m2Txns, m2Debtors, m2Loans);
  m2.credit_score = m2Metrics.creditScore;
  m2.approved_credit_limit = m2Metrics.approvedLoanLimit;

  const m3Txns = transactions.filter((t) => t.merchant_id === m3Id);
  const m3Debtors = debtors.filter((d) => d.merchant_id === m3Id);
  const m3Loans = loans.filter((l) => l.merchant_id === m3Id);
  const m3Metrics = ScoringService.calculateCreditMetrics(m3, m3Txns, m3Debtors, m3Loans);
  m3.credit_score = m3Metrics.creditScore;
  m3.approved_credit_limit = m3Metrics.approvedLoanLimit;

  // Persist into database connection
  await db.upsertMerchant(m1);
  await db.upsertMerchant(m2);
  await db.upsertMerchant(m3);

  db.seedDirectly([m1, m2, m3], transactions, debtors, loans);

  console.log('✅ Seed dataset successfully loaded into ALAT Sabi Database!');
}
