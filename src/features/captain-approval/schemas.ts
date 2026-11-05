import { z } from 'zod';

export const intakeAnswersSchema = z.object({
  current_tool: z.enum(['whatsapp_excel', 'other_app', 'just_starting']),
  main_challenge: z.enum(['time_on_tables', 'tracking_progress', 'unprofessional_look']),
  players_range: z.enum(['1-10', '11-50', '50+']),
}).strict();

export function normalizeWhatsapp(value: string): string {
  const digits = value.trim()
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\s().-]/g, '');
  if (/^01[0125]\d{8}$/.test(digits)) return `+2${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return digits;
}

export function normalizeInstagram(value: string): string {
  const trimmed = value.trim();
  if (/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i.test(trimmed)) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      if (!/^\/[A-Za-z0-9._]+\/?$/.test(url.pathname)) return trimmed;
      return url.pathname.replace(/^\/|\/$/g, '');
    } catch { return trimmed; }
  }
  return trimmed.replace(/^@/, '');
}

export const intakeSchema = intakeAnswersSchema.extend({
  full_name: z.string().trim().min(1).max(80),
  whatsapp: z.string().transform(normalizeWhatsapp).pipe(z.string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .refine(value => !value.startsWith('+20') || /^\+201[0125]\d{8}$/.test(value))),
  instagram: z.string().transform(normalizeInstagram).pipe(z.string().regex(/^(?:[A-Za-z0-9_](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?)?$/)
    .refine(value => !value.includes('..'))),
});

export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;
