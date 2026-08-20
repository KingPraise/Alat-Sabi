import { Router } from 'express';
import multer from 'multer';
import {
  handleLedgerEntry,
  handleVoiceUpload,
  getMerchantDashboard,
  getMerchantDebtors,
  settleDebtor,
  applyLoan,
  getWemaUnderwriteDashboard,
} from '../controllers/api.controller';

const router = Router();

// Configure multer memory storage (limit file size to 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// 1. Voice Webhook Ledger Entry (JSON Payload)
router.post('/ledger/entry', handleLedgerEntry);

// 2. Web Fallback Voice Audio File Upload (Multipart Form Data)
router.post('/ledger/voice-upload', upload.single('audio'), handleVoiceUpload);

// 3. Merchant Aggregated Dashboard
router.get('/merchant/dashboard/:phone_number', getMerchantDashboard);

// 4. Active Debtors with WhatsApp Reminder Links
router.get('/debtors/:phone_number', getMerchantDebtors);

// 5. Settle / Pay Debtor Balance
router.post('/debtors/settle', settleDebtor);

// 6. Loan Drawdown Request
router.post('/loans/apply', applyLoan);

// 7. Wema Bank Admin Underwriter Ranking Dashboard
router.get('/wema/admin/underwrite', getWemaUnderwriteDashboard);

export default router;
