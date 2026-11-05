import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import { messages } from './messages';

export function authSchemas(t: Translator<typeof messages> = createT(messages, 'ar')) {
  const email = z.email(t('enterAValidEmail')).trim();
  const passwordSchema = z.string().min(8, t('useAtLeast8Characters'))
    .regex(/\p{L}/u, t('includeAtLeastOneLetter')).regex(/[0-9]/, t('includeAtLeastOneNumber'));
  const emailSchema = z.object({ email: z.string().trim().pipe(email) });
  const signInSchema = emailSchema.extend({ password: z.string().min(1, t('enterYourPassword')) });
  const signUpSchema = emailSchema.extend({
    password: passwordSchema, full_name: z.string().trim().min(1, t('enterYourName')).max(80, t('nameIsTooLong')),
  });
  const resetSchema = z.object({ password: passwordSchema, confirm: z.string() })
    .refine((value) => value.password === value.confirm, { message: t('passwordsDoNotMatch'), path: ['confirm'] });
  const otpSchema = emailSchema.extend({ token: z.string().regex(/^[0-9]{6}$/, t('enterThe6DigitCode')) });
  return { passwordSchema, emailSchema, signInSchema, signUpSchema, resetSchema, otpSchema };
}

export const { passwordSchema, emailSchema, signInSchema, signUpSchema, resetSchema, otpSchema } = authSchemas();
