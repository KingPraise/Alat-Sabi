import { db } from '../db/connection';
import { ScoringService } from './scoring.service';

export class WemaAdminService {
  /**
   * GET Underwriter Dashboard for Wema Bank Credit Officers
   * Ranks merchants by credit score, daily volume (ADV), liquidity ratio, and default risk.
   */
  static async getUnderwritingDashboard() {
    const merchants = await db.getAllMerchants();
    const allLoans = await db.getAllLoans();

    const merchantRankings = await Promise.all(
      merchants.map(async (m) => {
        const txns = await db.getTransactionsByMerchant(m.id);
        const debtors = await db.getDebtorsByMerchant(m.id);
        const merchantLoans = allLoans.filter((l) => l.merchant_id === m.id);

        const metrics = ScoringService.calculateCreditMetrics(m, txns, debtors, merchantLoans);

        const totalSalesVolume = txns.reduce((sum, t) => sum + Number(t.total_amount), 0);
        const activeLoanCount = merchantLoans.filter((l) => l.status === 'active').length;
        const totalLoanAmount = merchantLoans.reduce((sum, l) => sum + Number(l.loan_amount), 0);
        const totalDebtOutstanding = debtors.reduce((sum, d) => sum + Number(d.total_owed), 0);

        // Risk Level mapping
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        if (metrics.creditScore >= 700 && metrics.liquidityRatio >= 0.8) {
          riskLevel = 'LOW';
        } else if (metrics.creditScore >= 550) {
          riskLevel = 'MEDIUM';
        } else {
          riskLevel = 'HIGH';
        }

        return {
          merchant_id: m.id,
          phone_number: m.phone_number,
          business_name: m.business_name,
          wema_virtual_account: m.wema_virtual_account,
          credit_score: metrics.creditScore,
          approved_credit_limit: metrics.approvedLoanLimit,
          adv: metrics.adv,
          liquidity_ratio: metrics.liquidityRatio,
          total_sales_volume: Math.round(totalSalesVolume * 100) / 100,
          total_transactions: txns.length,
          total_debt_outstanding: Math.round(totalDebtOutstanding * 100) / 100,
          active_loans: activeLoanCount,
          total_loans_disbursed: Math.round(totalLoanAmount * 100) / 100,
          risk_level: riskLevel,
          onboarded_at: m.created_at,
        };
      })
    );

    // Rank merchants by Credit Score DESC, then ADV DESC
    merchantRankings.sort((a, b) => {
      if (b.credit_score !== a.credit_score) {
        return b.credit_score - a.credit_score;
      }
      return b.adv - a.adv;
    });

    const totalPortfolioDisbursed = allLoans.reduce((sum, l) => sum + Number(l.loan_amount), 0);
    const lowRiskCount = merchantRankings.filter((m) => m.risk_level === 'LOW').length;
    const mediumRiskCount = merchantRankings.filter((m) => m.risk_level === 'MEDIUM').length;
    const highRiskCount = merchantRankings.filter((m) => m.risk_level === 'HIGH').length;

    return {
      status: 'success',
      bank_summary: {
        total_merchants_onboarded: merchants.length,
        total_credit_portfolio_disbursed: Math.round(totalPortfolioDisbursed * 100) / 100,
        risk_breakdown: {
          low_risk: lowRiskCount,
          medium_risk: mediumRiskCount,
          high_risk: highRiskCount,
        },
      },
      underwriting_leaderboard: merchantRankings,
    };
  }
}
