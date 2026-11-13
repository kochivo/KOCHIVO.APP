import { z } from 'zod';
import { coachSlug } from '@/lib/coach-slug';
import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import { messages } from './messages';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { isValidTimezone } from '@/lib/timezone';

export const socialKeys = ['whatsapp', 'instagram', 'tiktok', 'facebook', 'youtube', 'x'] as const;
export type SocialKey = typeof socialKeys[number];
export const timezones = Array.from(new Set([DEFAULT_TIMEZONE, ...(typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'America/New_York'])]));
const domains = { instagram: ['instagram.com'], tiktok: ['tiktok.com'], facebook: ['facebook.com', 'fb.com'],
  youtube: ['youtube.com', 'youtu.be'], x: ['x.com', 'twitter.com'] };
function internationalInput(input: unknown, keys: string[]): unknown {
  if (internationalEnabled() || !input || typeof input !== 'object' || Array.isArray(input)) return input;
  const value: Record<string, unknown> = { ...input };
  for (const key of keys) delete value[key];
  return value;
}
export function normalizeSocial(key: SocialKey, raw: string): string | null {
  const value = raw.trim();
  if (!value) return '';
  if (key === 'whatsapp') {
    let digits = value.replace(/^https:\/\/wa\.me\//, '').replace(/[\s()+-]/g, '');
    if (/^01[0125]\d{8}$/.test(digits)) digits = `2${digits}`;
    if (digits.startsWith('00')) digits = digits.slice(2);
    return /^[1-9]\d{7,14}$/.test(digits) ? `https://wa.me/${digits}` : null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      domains[key].some(domain => url.hostname === domain || url.hostname === `www.${domain}`) ? url.href : null;
  } catch { return null; }
}

export function settingsSchemas(t: Translator<typeof messages> = createT(messages, 'ar'), player = false) {
  const profileSchema = z.object({
    timezone: z.string().refine(isValidTimezone, t('invalidTimezone')).optional(),
    timezone_auto: z.boolean().optional(),
    full_name: z.string().trim().min(1, t('enterYourName')).max(80, t('nameMustBe80CharactersOr')),
    phone: player ? z.union([z.literal('').transform(() => null), z.null(),
      z.string().regex(/^\+[1-9][0-9]{7,14}$/, t('useAnInternationalNumberLike201012345678'))]) :
      z.string().regex(/^\+[1-9][0-9]{7,14}$/, t('useAnInternationalNumberLike201012345678')),
    avatar_path: z.string().max(200).nullable().optional(),
  });

  const inviteMessageSchema = z.object({
    invite_message: z.string().max(500, t('messageMustBe500CharactersOr')),
  });
  const link = (key: SocialKey) => z.string().trim().max(200, t('invalidLink')).transform((value, ctx) => {
    const normalized = normalizeSocial(key, value);
    if (normalized === null || normalized.length > 200) {
      ctx.addIssue({ code: 'custom', message: t('invalidLink') }); return z.NEVER;
    }
    return normalized;
  }).optional();
  const captainProfileSchema = z.object({
    timezone_auto: z.boolean().optional(),
    public_slug: z.string().refine(value => value === '' || coachSlug(value) !== null, t('invalidSlug')).optional(),
    full_name: profileSchema.shape.full_name,
    bio: z.string().trim().max(280, t('bioTooLong')),
    location: z.string().trim().max(80, t('locationTooLong')),
    timezone: z.string().refine(value => internationalEnabled() ? isValidTimezone(value) : timezones.includes(value), t('invalidTimezone')),
    units: z.enum(['metric', 'imperial'], { error: t('invalidUnits') }),
    social: z.object({ whatsapp: link('whatsapp'), instagram: link('instagram'), tiktok: link('tiktok'),
      facebook: link('facebook'), youtube: link('youtube'), x: link('x') }).strict(),
    avatar_path: z.string().max(200).nullable().optional(),
  });
  return {
    profileSchema: z.preprocess(input => internationalInput(input, ['timezone', 'timezone_auto']), profileSchema),
    inviteMessageSchema,
    captainProfileSchema: z.preprocess(input => internationalInput(input, ['timezone_auto']), captainProfileSchema),
  };
}

export type CaptainProfileInput = z.infer<ReturnType<typeof settingsSchemas>['captainProfileSchema']>;

export const { profileSchema, inviteMessageSchema } = settingsSchemas();

export type SettingsProfile = {
  specialties?: string[];
  years_experience?: number | null;
  languages?: ('ar' | 'en')[];
  show_public_stats?: boolean;
  public_slug?: string | null;
  id: string;
  role: 'captain' | 'player';
  full_name: string;
  phone: string | null;
  invite_message: string | null;
  deletion_requested_at: string | null;
  timezone?: string;
  timezone_auto?: boolean;
  bio?: string | null;
  location?: string | null;
  units?: 'metric' | 'imperial';
  avatar_path?: string | null;
  social?: Partial<Record<SocialKey, string>>;
};
