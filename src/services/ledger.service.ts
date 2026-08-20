import { db } from '../db/connection';
import { LedgerEntryInput } from '../validation/schemas';
import { ScoringService } from './scoring.service';
import { Merchant, Transaction, Debtor, Loan } from '../types';

export class LedgerService {
  /**
   * Core AI Voice Webhook Ingestion Logic
   */
  static async processVoiceEntry(input: LedgerEntryInput) {
    // 1. Fetch or create merchant
    let merchant = await db.getMerchantByPhone(input.phone_number);
    if (!merchant) {
      merchant = await db.upsertMerchant({
        phone_number: input.phone_number,
        business_name: input.business_name || `Merchant ${input.phone_number.slice(-4)}`,
      });
    }

    // 2. Record Transaction
    const transaction = await db.addTransaction({
      merchant_id: merchant.id,
      items: input.items,
      total_amount: input.total_amount,
      amount_paid: input.amount_paid,
      debt_amount: input.debt_amount,
      payment_method: input.payment_method,
      raw_transcript: input.raw_transcript,
    });

    // 3. Upsert Debtor if debt exists
    let debtorRecord: Debtor | null = null;
    if (input.debt_amount > 0 && input.debtor_name) {
      debtorRecord = await db.upsertDebtor(
        merchant.id,
        input.debtor_name,
        input.debt_amount
      );
    }

    // 4. Recalculate merchant credit metrics & loan limit
    const allTxns = await db.getTransactionsByMerchant(merchant.id);
    const allDebtors = await db.getDebtorsByMerchant(merchant.id);
    const allLoans = await db.getLoansByMerchant(merchant.id);

    const metrics = ScoringService.calculateCreditMetrics(
      merchant,
      allTxns,
      allDebtors,
      allLoans
    );

    // 5. Update Merchant Profile with new score & limit
    merchant = await db.upsertMerchant({
      phone_number: merchant.phone_number,
      credit_score: metrics.creditScore,
      approved_credit_limit: metrics.approvedLoanLimit,
    });

    // 6. Return Structured Receipt JSON
    return {
      status: 'success',
      message: 'Transaction successfully processed and voice note ledgered',
      receipt: {
        receipt_id: transaction.id,
        business_name: merchant.business_name,
        merchant_phone: merchant.phone_number,
        wema_virtual_account: merchant.wema_virtual_account,
        items: transaction.items,
        total_amount: transaction.total_amount,
        amount_paid: transaction.amount_paid,
        debt_amount: transaction.debt_amount,
        debtor_name: debtorRecord ? debtorRecord.debtor_name : null,
        payment_method: transaction.payment_method,
        timestamp: transaction.created_at,
      },
      merchant_underwriting: {
        updated_credit_score: merchant.credit_score,
        approved_credit_limit: merchant.approved_credit_limit,
        adv: metrics.adv,
        liquidity_ratio: metrics.liquidityRatio,
      },
    };
  }
}
