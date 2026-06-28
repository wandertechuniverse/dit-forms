import { z } from 'zod';

const keyPattern = /^[a-z][a-z0-9_]*$/;

export const fieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label required'),
  value: z.string().min(1, 'Option value required'),
});

export const fieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, 'Key required').max(50).regex(keyPattern, 'Must start with letter, lowercase, no spaces'),
  label: z.string().min(1, 'Label required').max(100),
  type: z.enum(['text', 'number', 'textarea', 'select', 'date', 'file', 'handout_array']),
  required: z.boolean().default(false),
  options: z.array(fieldOptionSchema).optional(),
  accept: z.string().max(100).optional(),
  maxFiles: z.number().int().min(1).max(50).optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'select' && (!data.options || data.options.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select fields need at least one option', path: ['options'] });
  }
});

export const formSchema = z.object({
  fields: z.array(fieldSchema).min(1, 'At least one field required').superRefine((fields, ctx) => {
    const keys = fields.map(f => f.key);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Field keys must be unique', path: ['fields'] });
    }
  }),
});

export function validateFormSchema(fields) {
  const result = formSchema.safeParse({ fields });
  if (result.success) return { valid: true, errors: null, data: result.data };
  const errors = {};
  for (const err of result.error.issues) {
    const path = err.path;
    if (path[0] === 'fields' && typeof path[1] === 'number') {
      const idx = path[1];
      const field = path[2] ?? 'root';
      errors[idx] = errors[idx] || {};
      errors[idx][String(field)] = err.message;
    } else if (path[0] === 'fields') {
      errors[-1] = errors[-1] || {};
      errors[-1].root = err.message;
    }
  }
  return { valid: false, errors, data: null };
}

export function validateField(field) {
  const result = fieldSchema.safeParse(field);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: result.error.issues.map(i => i.message) };
}
