import 'server-only';
import { createHmac } from 'node:crypto';
import { getPlayerTimezone } from '@/core/timezone/server';
import { DEFAULT_TIMEZONE, formatDateAr, localDate } from '@/lib/dates';
import type { AccountReply } from '@/features/ko-core';
import type { KoActor } from './account';
import { limits } from './limits';
import type { KoTier } from './limits';
import type { createT } from '@/core/i18n/messages';
import type { messages } from '../messages';

// Credits reset on Cairo months, matching ko_usage_take.
const monthStart = (now: number) => `${localDate(new Date(now), DEFAULT_TIMEZONE).slice(0, 7)}-01`;
type Locale = 'ar' | 'en';
type Translate = ReturnType<typeof createT<typeof messages>>;

export async function takeUsage(actor: KoActor, now: number, photo: boolean, secret: string) {
  const owner = await actor.db.rpc('ko_usage_tier');
  if (owner.error) throw owner.error;
  const row = owner.data[0];
  if (!row) return 'daily';
  const cap = Object.hasOwn(limits, row.tier) ? limits[row.tier as KoTier] : limits.entry;
  const monthCap = Math.min(cap.calls, limits.empire.calls);
  const timezone = await getPlayerTimezone(actor.id);
  const { data, error } = await actor.db.rpc('ko_usage_take', {
    p_day: localDate(new Date(now), timezone),
    p_kind: photo ? 'photo' : 'message',
    p_msg_cap: Math.min(actor.role === 'player' ? cap.playerMessages : cap.captainMessages, limits.empire.captainMessages),
    p_photo_cap: Math.min(cap.photos, limits.empire.photos),
    p_month_cap: monthCap,
  });
  if (error) throw error;
  if (data === 'monthly') {
    const month = monthStart(now);
    const proof = createHmac('sha256', secret).update(`ko-usage-warning:${row.captain_id}:${month}:${monthCap}`).digest('hex');
    const warning = await actor.db.rpc('ko_usage_claim_warning', { p_month_cap: monthCap, p_proof: proof });
    if (warning.data === true) console.warn('KO monthly Gemini cap reached', { captainId: row.captain_id, month });
  }
  if (data !== 'ok' && data !== 'daily' && data !== 'monthly') throw new Error('Invalid KO usage result');
  return data;
}

export async function readCredits(actor: KoActor, locale: Locale) {
  const { data, error } = await actor.db.rpc('ko_usage_summary');
  if (error) throw error;
  const row = data[0];
  if (!row) throw new Error('Missing KO credit summary');
  const next = new Date(`${row.month}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    used: row.credits_used, cap: row.credits_cap, monthStart: row.month,
    month: formatDateAr(localDate(next, 'UTC'), { month: 'long' }, locale),
  };
}

export async function takeCredit(actor: KoActor, credits: Awaited<ReturnType<typeof readCredits>>, token: string) {
  const { data, error } = await actor.db.rpc('ko_credit_take', {
    p_month: credits.monthStart, p_cap: Math.min(credits.cap, limits.empire.credits), p_token: token,
  });
  if (error) throw error;
  return data === true;
}

export function creditsOut(credits: Awaited<ReturnType<typeof readCredits>>, t: Translate): Extract<AccountReply, { kind: 'message' }> {
  const next = (Object.entries(limits) as [KoTier, (typeof limits)[KoTier]][])
    .find(([, limit]) => limit.credits > credits.cap);
  return {
    kind: 'message', text: t('creditsOut', credits),
    ...(next && { upgrade: { tier: next[0], credits: next[1].credits } }),
  };
}
