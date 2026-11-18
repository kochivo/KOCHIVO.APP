import { localDate } from '@/lib/dates';

export interface InvitePackage {
  id: string; name: string; kind: 'days' | 'sessions'; days: number; sessions: number | null; price_egp: number;
}
export interface InvitePlan {
  packageId: string | null; kind: 'days' | 'sessions'; quantity: number;
  price: number; paid: number; freeTrial: boolean; startsOn: string;
}
export interface PlayerInvite extends InvitePlan { name: string; whatsapp: string; formIds?: string[]; gate?: boolean }

export function defaultInvitePlan(pkg: InvitePackage | undefined, today: string): InvitePlan {
  return { packageId: pkg?.id ?? null, kind: pkg?.kind ?? 'days',
    quantity: pkg ? (pkg.kind === 'sessions' ? pkg.sessions ?? 1 : pkg.days) : 30,
    price: pkg?.price_egp ?? 0, paid: pkg?.price_egp ?? 0, freeTrial: false, startsOn: today };
}
export function inviteAmounts(plan: Pick<InvitePlan, 'price' | 'paid' | 'freeTrial'>, pkg?: InvitePackage) {
  const price = plan.freeTrial ? 0 : plan.price;
  const paid = plan.freeTrial ? 0 : plan.paid;
  return { price, paid, remaining: Math.max(0, price - paid),
    discount: plan.freeTrial ? 0 : Math.max(0, (pkg?.price_egp ?? price) - price) };
}
export function shiftInviteDate(date: string, days: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return localDate(at, 'UTC');
}
export function isInviteDate(date: string, today?: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (today && (date < shiftInviteDate(today, -30) || date > shiftInviteDate(today, 60))) return false;
  const at = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(at.getTime()) && localDate(at, 'UTC') === date;
}
export function inviteEndDate(plan: Pick<InvitePlan, 'kind' | 'quantity' | 'startsOn'>, pkg?: InvitePackage): string {
  return shiftInviteDate(plan.startsOn, plan.kind === 'days' ? plan.quantity - 1 : pkg?.days ?? 60);
}
export function inviteDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)));
}

/** Invalid input stays distinct from an omitted optional number. */
export function normalizeWhatsapp(input: string): string | null | undefined {
  const value = inviteDigits(input.trim());
  if (!value) return null;
  if (!/^[0-9]{8,15}$/.test(value)) return undefined;
  return /^01[0-9]{9}$/.test(value) ? `2${value}` : value;
}
