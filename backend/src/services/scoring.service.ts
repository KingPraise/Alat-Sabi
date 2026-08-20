import { Merchant, Transaction, Debtor, Loan } from '../types';

export interface ScoringMetrics {
  adv: number; // Average Daily Volume
  liquidityRatio: number; // Cash+Transfer settlements / Total Sales
  approvedLoanLimit: number; // (ADV * 7) * LR
  creditScore: number; // Integer between 300 and 850
}

export class ScoringService {
  /**
   * Calculates cashflow metrics, credit score (300 - 850), and loan limit for a merchant.
   *
   * Formula Rules:
   * 1. Average Daily Volume (ADV) = (Total settled sales in window) / (Active days or min 1)
   * 2. Liquidity Ratio (LR) = (Cash + Transfer Settlements) / Total Sales (defaults to 1.0 if sales = 0)
   * 3. Approved Loan Limit = (ADV * 7) * LR
   * 4. Credit Score (300 to 850 range) mapped from turnover velocity, debt collection rate, and transaction frequency.
   */
  static calculateCreditMetrics(
    merchant: Merchant,
    transactions: Transaction[],
    debtors: Debtor[],
    loans: Loan[]
  ): ScoringMetrics {
    if (transactions.length === 0) {
      return {
        adv: 0,
        liquidityRatio: 1.0,
        approvedLoanLimit: 0,
        creditScore: 300,
      };
    }

    // Sort transactions by date
    const sortedTxns = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstTxnDate = new Date(sortedTxns[0].created_at);
    const lastTxnDate = new Date(sortedTxns[sortedTxns.length - 1].created_at);
    const now = new Date();

    // Active span in days (minimum 1 day)
    const activeSpanDays = Math.max(
      1,
      Math.ceil((now.getTime() - firstTxnDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Total sales & settled (paid) sales
    let totalSales = 0;
    let cashTransferSettledSales = 0;
    let totalPaidSales = 0;

    for (const txn of transactions) {
      const total = Number(txn.total_amount);
      const paid = Number(txn.amount_paid);
      totalSales += total;
      totalPaidSales += paid;

      if (txn.payment_method === 'cash' || txn.payment_method === 'transfer') {
        cashTransferSettledSales += paid;
      } else if (txn.payment_method === 'split') {
        cashTransferSettledSales += paid;
      }
    }

    // 1. Average Daily Volume (ADV)
    const adv = totalPaidSales / activeSpanDays;

    // 2. Liquidity Ratio (LR)
    const liquidityRatio = totalSales > 0 ? cashTransferSettledSales / totalSales : 1.0;

    // 3. Approved Loan Limit
    let approvedLoanLimit = Math.round((adv * 7) * liquidityRatio * 100) / 100;

    // Deduct active loan outstanding balances from available loan limit
    const activeLoanBalance = loans
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (Number(l.loan_amount) - Number(l.amount_repaid)), 0);

    approvedLoanLimit = Math.max(0, approvedLoanLimit - activeLoanBalance);

    // 4. Credit Score Calculation (300 to 850 range)
    // Base score = 300
    let score = 300;

    // Factor A: Turnover Volume (Up to +200 points)
    // Scale: 500,000 NGN turnover yields max 200 points
    const turnoverScore = Math.min(200, (totalSales / 500000) * 200);
    score += turnoverScore;

    // Factor B: Transaction Frequency & Consistency (Up to +150 points)
    // 30 transactions yields max 150 points
    const frequencyScore = Math.min(150, (transactions.length / 30) * 150);
    score += frequencyScore;

    // Factor C: Liquidity & Prompt Settlement Ratio (Up to +120 points)
    const liquidityScore = liquidityRatio * 120;
    score += liquidityScore;

    // Factor D: Debt Management (Up to +80 points)
    // Ratio of settled/collected debts vs total debts accrued
    const totalOwed = debtors.reduce((sum, d) => sum + Number(d.total_owed), 0);
    const totalDebtsAccrued = totalSales - totalPaidSales + totalOwed;
    const debtCollectionRate = totalDebtsAccrued > 0 ? (totalDebtsAccrued - totalOwed) / totalDebtsAccrued : 1.0;
    const debtScore = Math.max(0, debtCollectionRate * 80);
    score += debtScore;

    // Penalty for defaulted loans (-150 points per default)
    const defaults = loans.filter((l) => l.status === 'defaulted').length;
    score -= defaults * 150;

    // Clamp score within [300, 850]
    const finalCreditScore = Math.min(850, Math.max(300, Math.round(score)));

    return {
      adv: Math.round(adv * 100) / 100,
      liquidityRatio: Math.round(liquidityRatio * 100) / 100,
      approvedLoanLimit: Math.round(approvedLoanLimit * 100) / 100,
      creditScore: finalCreditScore,
    };
  }
}
