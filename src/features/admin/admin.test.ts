import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captainState, endsLabel, tierLabel, usageLabel } from './format';
import { activationSchema, suspensionSchema } from './schemas';
import { requireAdmin } from './data/require-admin';
import { fetchCaptains } from './data/captains';
import { activatePlan } from './data/activate-plan';
import { setSuspended } from './data/set-suspended';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { KpiRow } from './components/kpi-row';
import { CaptainsTable } from './components/captains-table';
import type { CaptainRow } from './types';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc }) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
const id = '018f47ac-6172-7000-8000-000000000001';
const row: CaptainRow = {
  id, full_name: 'كابتن', email: 'captain@example.com', email_confirmed: true,
  created_at: '2026-11-01T10:00:00Z', tier: 'entry', tier_ends_at: null,
  active_players: 0, player_limit: 5, suspended: false,
  last_paid_tier: null, last_paid_ends_at: null, over_limit: false,
};
const input = { captain_id: id, tier: 'legend', months: 1 };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});

describe('captain display', () => {
  it.each([
    [{ suspended: true, email_confirmed: false }, 'suspended'],
    [{ email_confirmed: false }, 'unconfirmed'],
    [{ last_paid_tier: 'legend', last_paid_ends_at: '2026-11-02T20:00:00Z' }, 'expired'],
    [{ tier: 'legend', tier_ends_at: '2026-11-02T20:00:00Z' }, 'paid'],
    [{ tier: 'legend', last_paid_ends_at: '2026-11-02T20:00:00Z' }, 'paid'],
    [{ tier: 'legend', tier_ends_at: '2026-11-03T20:00:00Z' }, 'paid'],
    [{ tier: 'champion', tier_ends_at: null }, 'paid'],
    [{}, 'free'],
  ] as const)('classifies %j as %s', (patch, expected) => {
    expect(captainState({ ...row, ...patch })).toBe(expected);
  });
  it('formats usage and tier', () => {
    expect(usageLabel(31, 40)).toBe('31 من 40');
    expect(tierLabel('entry')).toBe('ENTRY');
  });
  it('handles absent and invalid dates', () => {
    expect(endsLabel(null)).toBe('—');
    expect(endsLabel('invalid')).toBe('—');
  });
  it('shows expired plan history and over-limit warnings in both layouts', () => {
    const html = renderToStaticMarkup(createElement(CaptainsTable, {
      rows: [{ ...row, last_paid_tier: 'legend', last_paid_ends_at: '2026-11-02T23:30:00Z',
        active_players: 6, over_limit: true }],
      selected: null, onActivate: () => {}, onSuspend: () => {},
    }));
    expect(html.match(/انتهت LEGEND يوم 3 نوفمبر 2026/g)).toHaveLength(2);
    expect(html.match(/فوق الحد/g)).toHaveLength(2);
  });
});

describe('schemas', () => {
  it.each(['entry', 'champion', 'legend', 'empire'])('accepts %s', tier => {
    expect(activationSchema.safeParse({ ...input, tier, months: 12, payment_ref: 'x'.repeat(80) }).success).toBe(true);
  });
  it.each([{ tier: 'other' }, { months: 0 }, { months: 13 }, { months: 1.5 },
    { payment_ref: 'x'.repeat(81) }, { captain_id: 'bad' }])('rejects %j', patch => {
    expect(activationSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it('accepts optional payment reference', () => {
    expect(activationSchema.safeParse(input).success).toBe(true);
  });
  it.each([2, 201])('rejects reason length %i', length => {
    expect(suspensionSchema.safeParse({ user_id: id, suspended: true, reason: 'x'.repeat(length) }).success).toBe(false);
  });
  it.each([3, 200])('accepts reason length %i', length => {
    expect(suspensionSchema.safeParse({ user_id: id, suspended: false, reason: 'x'.repeat(length) }).success).toBe(true);
  });
});

describe('page KPIs', () => {
  const props = { today: '2026-11-03', now: '2026-11-03T12:00:00Z' };
  function value(html: string, label: string) {
    return html.match(new RegExp(`<dt[^>]*>${label}</dt><dd[^>]*>(\\d+)</dd>`))?.[1];
  }
  it('counts expired entry plans independently of suspension and confirmation', () => {
    const expired = { ...row, last_paid_tier: 'legend' as const, last_paid_ends_at: '2026-11-02T00:00:00Z' };
    const html = renderToStaticMarkup(createElement(KpiRow, { ...props, rows: [
      expired, { ...expired, suspended: true }, { ...expired, email_confirmed: false },
      { ...expired, tier: 'legend' }, row,
    ] }));
    expect(value(html, 'باقات خلصت')).toBe('3');
  });
  it('counts live paid plans independently of suspension and confirmation', () => {
    const html = renderToStaticMarkup(createElement(KpiRow, { ...props, rows: [
      { ...row, id: 'a', tier: 'legend', suspended: true, tier_ends_at: '2026-12-01T00:00:00Z' },
      { ...row, id: 'b', tier: 'champion', email_confirmed: false, tier_ends_at: '2026-12-01T00:00:00Z' },
      { ...row, id: 'c', tier: 'legend', tier_ends_at: '2026-11-02T00:00:00Z' },
      row,
    ] }));
    expect(value(html, 'باقات مدفوعة')).toBe('2');
  });
  it('counts only unconfirmed zero-player accounts created in the past 24 hours', () => {
    const recent = { ...row, email_confirmed: false, created_at: '2026-11-03T11:00:00Z' };
    const html = renderToStaticMarkup(createElement(KpiRow, { ...props, rows: [
      recent, { ...recent, id: 'b', active_players: 1 }, { ...recent, id: 'c', email_confirmed: true },
      { ...recent, id: 'd', created_at: '2026-11-02T12:00:00Z' },
      { ...recent, id: 'e', created_at: '2026-11-04T11:00:00Z' },
    ] }));
    expect(value(html, 'مشبوهين')).toBe('1');
    expect(html).not.toContain('مستنيين تفعيل');
    expect(html.match(/<dt /g)).toHaveLength(4);
  });
  it('labels capped results and preserves the scope of a partial later page', () => {
    const capped = renderToStaticMarkup(createElement(KpiRow, { ...props,
      rows: Array.from({ length: 100 }, (_, index) => ({ ...row, id: String(index) })),
    }));
    expect(capped).toContain('من أول 100');
    const later = renderToStaticMarkup(createElement(KpiRow, { ...props, rows: [row], scope: 'من الصفحة الحالية' }));
    expect(later).toContain('من الصفحة الحالية');
    expect(later).not.toContain('من أول 100');
  });
});

describe('admin boundary and actions', () => {
  it.each(['', '   '])('omits an empty search %j so the SQL default applies', async search => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchCaptains({ search })).toEqual({ rows: [], error: null });
    expect(mocks.rpc).toHaveBeenLastCalledWith('admin_captains', { p_limit: 100, p_offset: 0 });
  });
  it('preserves a trimmed search and pagination', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchCaptains({ search: '  captain  ', limit: 20, offset: 40 })).toEqual({ rows: [], error: null });
    expect(mocks.rpc).toHaveBeenLastCalledWith('admin_captains', { p_search: 'captain', p_limit: 20, p_offset: 40 });
  });
  it.each([{ data: false, error: null }, { data: true, error: { code: '42501' } }])('404s unauthorized results', async result => {
    mocks.rpc.mockResolvedValue(result);
    await expect(requireAdmin()).rejects.toThrow('NOT_FOUND');
  });
  it('404s transport failures', async () => {
    mocks.rpc.mockRejectedValue(new Error('network'));
    await expect(requireAdmin()).rejects.toThrow('NOT_FOUND');
  });
  it.each([activatePlan, (value: unknown) => setSuspended(value)])('maps denied RPCs to Arabic', async action => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'private' } });
    const value = action === activatePlan ? input : { user_id: id, suspended: true, reason: 'مراجعة' };
    expect(await action(value)).toEqual({ error: 'مش مسموح' });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('validates before mutations', async () => {
    expect(await activatePlan({ ...input, months: 0 })).toEqual({ error: 'راجع بيانات التفعيل' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('refreshes after activation', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: id, error: null });
    expect(await activatePlan(input)).toEqual({ success: true });
    expect(mocks.rpc).toHaveBeenLastCalledWith('admin_activate_plan', {
      p_captain: id, p_tier: 'legend', p_months: 1, p_payment_ref: null,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin');
  });
  it.each([
    [{ code: '22023', message: 'unknown tier' }, 'الباقة مش موجودة'],
    [{ code: '22023', message: 'target must be a captain' }, 'البيانات مش صحيحة، راجع الحساب والمدة'],
    [{ code: 'XX000', message: 'private server details' }, 'العملية ما كملتش، جرّب تاني'],
  ])('maps activation failures without leaking details', async (error, expected) => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error });
    expect(await activatePlan(input)).toEqual({ error: expected });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('refreshes and audits the submitted unsuspension reason through the RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: null });
    expect(await setSuspended({ user_id: id, suspended: false, reason: '  تمت المراجعة  ' })).toEqual({ success: true });
    expect(mocks.rpc).toHaveBeenLastCalledWith('admin_set_suspended', {
      p_user: id, p_suspended: false, p_reason: 'تمت المراجعة',
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin');
  });
  it('prevents invalid suspension reasons from reaching the mutation', async () => {
    expect(await setSuspended({ user_id: id, suspended: true, reason: '  ' })).toEqual({ error: 'اكتب سبب من 3 لـ 200 حرف' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('does not turn an unauthorized action into a successful result', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(activatePlan(input)).rejects.toThrow('NOT_FOUND');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('does not refresh after a transport failure', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockRejectedValueOnce(new Error('private'));
    expect(await activatePlan(input)).toEqual({ error: 'العملية ما كملتش، جرّب تاني' });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
