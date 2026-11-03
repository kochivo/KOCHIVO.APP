import { z } from 'zod';

const profileSchema = z.object({ demo_expires_at: z.iso.datetime({ offset: true }).nullable().optional() });

export function demoExpiry(profile: unknown): string | null {
  const result = profileSchema.safeParse(profile);
  return result.success ? result.data.demo_expires_at ?? null : null;
}

export function demoHours(expiresAt: string, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now.getTime()) / 3_600_000));
}

export function demoError(error: unknown): string {
  const result = z.object({ code: z.string().optional(), message: z.string().optional() }).safeParse(error);
  const message = result.success ? `${result.data.code ?? ''} ${result.data.message ?? ''}` : '';
  if (message.includes('demo_limit')) return 'الديمو زحمة دلوقتي، جرّب بعد شوية';
  if (/captcha|turnstile/i.test(message)) return 'اتأكد إنك مش روبوت وجرّب تاني';
  return 'الديمو مش متاح دلوقتي';
}
