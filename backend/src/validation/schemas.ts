import { z } from 'zod';

export const ledgerEntrySchema = z.object({
  phone_number: z.string().min(10, 'Invalid phone number format'),
  business_name: z.string().optional(),
  raw_transcript: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      qty: z.number().positive(),
      unit_price: z.number().nonnegative(),
      total: z.number().nonnegative(),
    })
  ).min(1, 'At least one item is required'),
  total_amount: z.number().nonnegative(),
  amount_paid: z.number().nonnegative(),
  debt_amount: z.number().nonnegative(),
  debtor_name: z.string().optional(),
  payment_method: z.enum(['cash', 'transfer', 'credit', 'split']),
});

export const debtorSettleSchema = z.object({
  debtor_id: z.string().uuid(),
  amount_paid: z.number().positive('Amount paid must be greater than zero'),
});

export const loanApplySchema = z.object({
  phone_number: z.string().min(10, 'Invalid phone number format'),
  requested_amount: z.number().positive('Requested amount must be greater than zero'),
});

export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;
export type DebtorSettleInput = z.infer<typeof debtorSettleSchema>;
export type LoanApplyInput = z.infer<typeof loanApplySchema>;
