import { db } from '../db/connection';
import { ScoringService } from './scoring.service';
import { LoanApplyInput, DebtorSettleInput } from '../validation/schemas';

const getISODateString = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
};

export class MerchantService {
  /**
   * GET Dashboard aggregated metrics for a merchant
   */
  static async getDashboard(phone: string) {
    let merchant = await db.getMerchantByPhone(phone);
    if (!merchant) {
      // Auto-create for new phone lookup
      merchant = await db.upsertMerchant({ phone_number: phone });
    }

    const txns = await db.getTransactionsByMerchant(merchant.id);
    const debtors = await db.getDebtorsByMerchant(merchant.id);
    const loans = await db.getLoansByMerchant(merchant.id);

    // Calculate Today's Sales Summary with robust Date/String coercion
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = (dateVal: any) => getISODateString(dateVal).startsWith(todayStr);
    const todayTxns = txns.filter((t) => isToday(t.created_at));

    let todayTotalSales = 0;
    let todayCashCollected = 0;
    let todayUnpaidDebts = 0;

    for (const t of todayTxns) {
      todayTotalSales += Number(t.total_amount);
      todayCashCollected += Number(t.amount_paid);
      todayUnpaidDebts += Number(t.debt_amount);
    }

    // Recalculate metrics
    const metrics = ScoringService.calculateCreditMetrics(merchant, txns, debtors, loans);

    // Update merchant record with metrics if needed
    if (merchant.credit_score !== metrics.creditScore || merchant.approved_credit_limit !== metrics.approvedLoanLimit) {
      merchant = await db.upsertMerchant({
        phone_number: merchant.phone_number,
        credit_score: metrics.creditScore,
        approved_credit_limit: metrics.approvedLoanLimit,
      });
    }

    const activeDebtors = debtors.filter((d) => d.status !== 'settled');
    const activeLoans = loans.filter((l) => l.status === 'active');

    return {
      status: 'success',
      merchant_profile: {
        id: merchant.id,
        phone_number: merchant.phone_number,
        business_name: merchant.business_name,
        wema_virtual_account: merchant.wema_virtual_account,
        wema_account_name: merchant.wema_account_name,
        credit_score: merchant.credit_score,
        approved_credit_limit: merchant.approved_credit_limit,
      },
      underwriting_metrics: {
        adv: metrics.adv,
        liquidity_ratio: metrics.liquidityRatio,
      },
      today_summary: {
        total_sales: Math.round(todayTotalSales * 100) / 100,
        cash_collected: Math.round(todayCashCollected * 100) / 100,
        unpaid_debts: Math.round(todayUnpaidDebts * 100) / 100,
        transaction_count: todayTxns.length,
      },
      recent_transactions: txns.slice(0, 10),
      active_debtors: activeDebtors,
      active_loans: activeLoans,
    };
  }

  /**
   * GET Active Debtors & formatted WhatsApp reminder click-to-chat links
   */
  static async getDebtors(phone: string) {
    const merchant = await db.getMerchantByPhone(phone);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const debtors = await db.getDebtorsByMerchant(merchant.id);
    const activeDebtors = debtors.filter((d) => d.status !== 'settled');

    const totalOwedAmount = activeDebtors.reduce((sum, d) => sum + Number(d.total_owed), 0);

    const debtorsWithWhatsapp = activeDebtors.map((debtor) => {
      const message = `Hello ${debtor.debtor_name}, this is a friendly reminder from ${merchant.business_name}. You have an outstanding balance of ₦${Number(debtor.total_owed).toLocaleString('en-NG')} for recent purchases. Kindly make payment to our Wema Virtual Account: ${merchant.wema_virtual_account} (${merchant.wema_account_name}). Thank you!`;
      const encodedMsg = encodeURIComponent(message);
      
      const phoneDigits = debtor.debtor_phone ? debtor.debtor_phone.replace(/\D/g, '') : '';
      const whatsappLink = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodedMsg}`
        : `https://wa.me/?text=${encodedMsg}`;

      return {
        id: debtor.id,
        debtor_name: debtor.debtor_name,
        debtor_phone: debtor.debtor_phone,
        total_owed: debtor.total_owed,
        status: debtor.status,
        created_at: debtor.created_at,
        whatsapp_reminder_link: whatsappLink,
      };
    });

    return {
      status: 'success',
      merchant_business_name: merchant.business_name,
      total_active_debtors: activeDebtors.length,
      total_outstanding_owed: Math.round(totalOwedAmount * 100) / 100,
      debtors: debtorsWithWhatsapp,
    };
  }

  /**
   * POST Settle or partially pay debtor debt
   */
  static async settleDebtor(input: DebtorSettleInput) {
    const updatedDebtor = await db.settleDebtor(input.debtor_id, input.amount_paid);
    
    // Recalculate merchant score
    const merchant = await db.getMerchantById(updatedDebtor.merchant_id);
    if (merchant) {
      const txns = await db.getTransactionsByMerchant(merchant.id);
      const debtors = await db.getDebtorsByMerchant(merchant.id);
      const loans = await db.getLoansByMerchant(merchant.id);
      const metrics = ScoringService.calculateCreditMetrics(merchant, txns, debtors, loans);

      await db.upsertMerchant({
        phone_number: merchant.phone_number,
        credit_score: metrics.creditScore,
        approved_credit_limit: metrics.approvedLoanLimit,
      });
    }

    return {
      status: 'success',
      message: updatedDebtor.status === 'settled' ? 'Debtor debt settled fully!' : 'Partial debt settlement recorded',
      debtor: updatedDebtor,
    };
  }

  /**
   * POST Apply / Drawdown Loan against Approved Credit Limit
   */
  static async applyLoan(input: LoanApplyInput) {
    const merchant = await db.getMerchantByPhone(input.phone_number);
    if (!merchant) {
      throw new Error('Merchant profile not found');
    }

    // Refresh underwriting metrics
    const txns = await db.getTransactionsByMerchant(merchant.id);
    const debtors = await db.getDebtorsByMerchant(merchant.id);
    const loans = await db.getLoansByMerchant(merchant.id);
    const metrics = ScoringService.calculateCreditMetrics(merchant, txns, debtors, loans);

    if (input.requested_amount > metrics.approvedLoanLimit) {
      throw new Error(
        `Requested loan amount (₦${input.requested_amount}) exceeds approved credit limit (₦${metrics.approvedLoanLimit})`
      );
    }

    const loan = await db.addLoan({
      merchant_id: merchant.id,
      loan_amount: input.requested_amount,
      interest_rate: 9.0,
      repayment_split_pct: 5.0,
      amount_repaid: 0,
      status: 'active',
    });

    // Re-evaluate approved credit limit after drawdown
    const updatedLoans = [...loans, loan];
    const updatedMetrics = ScoringService.calculateCreditMetrics(merchant, txns, debtors, updatedLoans);
    await db.upsertMerchant({
      phone_number: merchant.phone_number,
      approved_credit_limit: updatedMetrics.approvedLoanLimit,
    });

    return {
      status: 'success',
      message: 'Wema MSME Working Capital loan successfully disbursed!',
      loan: {
        loan_id: loan.id,
        merchant_id: loan.merchant_id,
        disbursed_amount: loan.loan_amount,
        interest_rate_pct: `${loan.interest_rate}%`,
        repayment_split_pct: `${loan.repayment_split_pct}% daily sales deduction`,
        status: loan.status,
        created_at: loan.created_at,
      },
      remaining_credit_limit: updatedMetrics.approvedLoanLimit,
    };
  }
}
