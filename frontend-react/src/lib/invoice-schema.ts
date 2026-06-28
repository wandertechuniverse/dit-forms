import { z } from 'zod';

const VALID_STATUSES = ['unpaid', 'paid', 'partially_paid'] as const;
const VALID_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP'] as const;

export const lineItemSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  handoutItemId: z.string().min(1, 'Handout item ID is required'),
  qty: z.number().int().gt(0, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().regex(
    /^INV-[A-Z0-9]+-\d{4}$/,
    'Invoice number must match INV-{term}-{4-digit-sequence}'
  ).optional(),
  status: z.string().superRefine((val, ctx) => {
    if (!(VALID_STATUSES as readonly string[]).includes(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid invoice status: ${val}. Must be one of: ${[...VALID_STATUSES].sort().join(', ')}`,
      });
    }
  }),
  currency: z.string().optional().superRefine((val, ctx) => {
    if (val !== undefined && !(VALID_CURRENCIES as readonly string[]).includes(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid currency: ${val}. Must be one of: ${[...VALID_CURRENCIES].sort().join(', ')}`,
      });
    }
  }),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  totalAmount: z.number().min(0),
}).superRefine((data, ctx) => {
  const expected = data.lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  if (Math.abs(data.totalAmount - expected) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Total must equal sum of line items. Expected: ${expected.toFixed(2)}, got: ${data.totalAmount.toFixed(2)}`,
    });
  }
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
