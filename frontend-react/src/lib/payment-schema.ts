import { z } from 'zod';

const VALID_METHODS = ['cash', 'bank', 'mobile', 'other'] as const;
const VALID_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP'] as const;

export const paymentSchema = z.object({
  amount: z.number()
    .gt(0.01, 'Amount must be greater than 0.01')
    .lte(1_000_000, 'Amount cannot exceed 1,000,000'),
  method: z.string(),
  currency: z.string().optional(),
  reference: z.string().max(100, 'Reference must be under 100 characters').optional(),
  paidAt: z.string().datetime().optional(),
  totalPaid: z.number().min(0).optional().default(0),
  totalOwed: z.number().min(0).optional().default(0),
}).superRefine((data, ctx) => {
  if (!(VALID_METHODS as readonly string[]).includes(data.method)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid payment method: ${data.method}. Must be one of: ${[...VALID_METHODS].sort().join(', ')}`,
    });
  }
  if (data.currency !== undefined && !(VALID_CURRENCIES as readonly string[]).includes(data.currency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid currency: ${data.currency}. Must be one of: ${[...VALID_CURRENCIES].sort().join(', ')}`,
    });
  }
  if (data.paidAt !== undefined && new Date(data.paidAt) > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Payment date cannot be in the future',
    });
  }
  const remaining = data.totalOwed - data.totalPaid;
  if (data.amount > remaining) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Payment would exceed remaining balance. Remaining: ${remaining.toFixed(2)}, attempted: ${data.amount.toFixed(2)}`,
    });
  }
});

export type PaymentInput = z.infer<typeof paymentSchema>;
