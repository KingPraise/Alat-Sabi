import { Router } from 'express';
import {
  handleLedgerEntry,
  getMerchantDashboard,
  getMerchantDebtors,
  settleDebtor,
  applyLoan,
  getWemaUnderwriteDashboard,
} from '../controllers/api.controller';

const router = Router();

// 1. Voice Webhook Ledger Entry
router.post('/ledger/entry', handleLedgerEntry);

// 2. Merchant Aggregated Dashboard
router.get('/merchant/dashboard/:phone_number', getMerchantDashboard);

// 3. Active Debtors with WhatsApp Reminder Links
router.get('/debtors/:phone_number', getMerchantDebtors);

// 4. Settle / Pay Debtor Balance
router.post('/debtors/settle', settleDebtor);

// 5. Loan Drawdown Request
router.post('/loans/apply', applyLoan);

// 6. Wema Bank Admin Underwriter Ranking Dashboard
router.get('/wema/admin/underwrite', getWemaUnderwriteDashboard);

export default router;
