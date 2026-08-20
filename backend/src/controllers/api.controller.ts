import { Request, Response, NextFunction } from 'express';
import { ledgerEntrySchema, debtorSettleSchema, loanApplySchema } from '../validation/schemas';
import { LedgerService } from '../services/ledger.service';
import { MerchantService } from '../services/merchant.service';
import { WemaAdminService } from '../services/wema.service';
import { VoiceService } from '../services/voice.service';

/**
 * Ledger Voice Webhook Entry Controller (JSON Payload)
 */
export const handleLedgerEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = ledgerEntrySchema.parse(req.body);
    const result = await LedgerService.processVoiceEntry(validatedInput);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Ledger Voice Audio Upload Controller (Multipart Audio File Ingestion)
 */
export const handleVoiceUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const { phone_number, business_name } = req.body;

    if (!file) {
      return res.status(400).json({ status: 'error', message: 'Audio file upload is required (field name: audio)' });
    }
    if (!phone_number) {
      return res.status(400).json({ status: 'error', message: 'phone_number parameter is required' });
    }

    // Parse audio note with Gemini AI
    const parsedVoice = await VoiceService.parseVoiceAudio(file.buffer, file.mimetype);

    // Assemble input for ledger service
    const ledgerInput = ledgerEntrySchema.parse({
      phone_number,
      business_name,
      raw_transcript: parsedVoice.raw_transcript,
      items: parsedVoice.items,
      total_amount: parsedVoice.total_amount,
      amount_paid: parsedVoice.amount_paid,
      debt_amount: parsedVoice.debt_amount,
      debtor_name: parsedVoice.debtor_name || undefined,
      payment_method: parsedVoice.payment_method,
    });

    const result = await LedgerService.processVoiceEntry(ledgerInput);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Merchant Dashboard Aggregation Controller
 */
export const getMerchantDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone_number } = req.params;
    if (!phone_number) {
      return res.status(400).json({ status: 'error', message: 'Phone number parameter required' });
    }
    const result = await MerchantService.getDashboard(phone_number);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Active Debtors list Controller
 */
export const getMerchantDebtors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone_number } = req.params;
    if (!phone_number) {
      return res.status(400).json({ status: 'error', message: 'Phone number parameter required' });
    }
    const result = await MerchantService.getDebtors(phone_number);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Settle Debtor Debt Controller
 */
export const settleDebtor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = debtorSettleSchema.parse(req.body);
    const result = await MerchantService.settleDebtor(validatedInput);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Loan Apply / Drawdown Controller
 */
export const applyLoan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = loanApplySchema.parse(req.body);
    const result = await MerchantService.applyLoan(validatedInput);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Wema Admin Underwriting Dashboard Controller
 */
export const getWemaUnderwriteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WemaAdminService.getUnderwritingDashboard();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
