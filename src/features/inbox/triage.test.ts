import { beforeEach, describe, expect, it, vi } from 'vitest';
import { triage, orderTriage, dailyAverages } from './triage';
import type { CheckinHistory, DailyCheck } from './triage';
import type { InboxItem } from './types';
import { createElement as h, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import type * as TriageData from './data/triage-inputs';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { InboxGroups } from './components/inbox-groups';
import { ReplyBox } from './components/reply-box';
import { FlagChip } from './components/flag-chip';
import { CheckinDetail } from './components/checkin-detail';
import { InboxScreen } from './components/inbox-screen';
import { InboxRow } from './components/inbox-row';
import { listInbox, reviewItem } from './data/inbox';
import { listTriageInputs } from './data/triage-inputs';
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('./data/inbox', () => ({ listInbox: vi.fn(), reviewItem: vi.fn() }));
vi.mock('./data/triage-inputs', () => ({ listTriageInputs: vi.fn(async () => ({ data: { history: [], dailyChecks: [] } })) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: () => {} }) }));
vi.mock('@/features/voice-notes', () => ({ VoiceRecorder: () => null,
  useRecorder: () => ({ state: { status: 'idle' }, reset: () => {} }) }));
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = hooks.cursor++, previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) hooks.effects.push(effect);
    hooks.slots[index] = deps;
  },
  useCallback: (callback: unknown) => callback,
}));
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; hooks.effects = []; vi.clearAllMocks(); });
vi.mock('./hooks/use-inbox-media', () => ({ useInboxMedia: () => ({ loading: true, urls: [], error: false }) }));

const now = new Date('2026-11-09T12:00:00Z');
const item: Extract<InboxItem, { kind: 'checkin' }> = {
  id: 'current', kind: 'checkin', player_id: 'p', player_name: 'Ali',
  created_at: '2026-11-09T09:00:00Z', week_start: '2026-11-07',
  body_weight_kg: 80, waist_cm: 90, notes: null, reply: null, reviewed_at: null,
};
const history: [CheckinHistory, CheckinHistory] = [
  { ...item, id: 'previous', week_start: '2026-10-31', body_weight_kg: 80.1 },
  { ...item, id: 'oldest', week_start: '2026-10-24', body_weight_kg: 80.2 },
];
const dailyRow: DailyCheck = { player_id: 'p', log_date: '2026-11-03', sleep_hours: 6, soreness: 3, deleted_at: null };
const daily = ['2026-11-03', '2026-11-05', '2026-11-09'].map(log_date => ({ ...dailyRow, log_date }));
const flags = (weight: number, checks: DailyCheck[] = daily, past: CheckinHistory[] = history) =>
  triage({ ...item, body_weight_kg: weight }, past, checks, now).flags.map(flag => flag.key);

describe('triage boundaries', () => {
  it('flags flat weight below 0.3 kg, including floating point boundaries', () => {
    expect(flags(80)).toContain('weight_flat');
    expect(flags(80.5)).not.toContain('weight_flat');
    expect(flags(79.9)).not.toContain('weight_flat');
  });
  it.each([78.1, 82.1])('flags weight jumps of exactly 2 kg: %s', weight => {
    expect(flags(weight)).toContain('weight_jump');
  });
  it('does not flag a jump under 2 kg or compare against future/other-player history', () => {
    expect(flags(82)).not.toContain('weight_jump');
    expect(flags(90, daily, [{ ...history[0], player_id: 'other' }, { ...history[0], week_start: '2026-11-14' }])).not.toContain('weight_jump');
  });
  it('requires all three consecutive weights and never substitutes zero', () => {
    expect(flags(80, daily, history.slice(0, 1))).not.toContain('weight_flat');
    expect(flags(80, daily, [{ ...history[0], body_weight_kg: null }, history[1]])).not.toContain('weight_flat');
    expect(triage({ ...item, body_weight_kg: null }, history, daily, now).flags).toEqual([]);
  });
  it('requires three non-null measurements separately for each average', () => {
    expect(flags(85, daily.map(row => ({ ...row, sleep_hours: 5.9, soreness: 4 })))).toEqual(['weight_jump', 'low_sleep', 'high_soreness']);
    expect(flags(85, daily.slice(0, 2).map(row => ({ ...row, sleep_hours: 5, soreness: 5 })))).toEqual(['weight_jump']);
    expect(flags(85, daily.map(row => ({ ...row, sleep_hours: 6, soreness: 3.9 })))).toEqual(['weight_jump']);
    expect(dailyAverages('p', daily.map(row => ({ ...row, sleep_hours: null })), now)).toMatchObject({ sleep: null, soreness: 3 });
  });
  it('counts only Cairo today and preceding six days, excluding deleted logs', () => {
    const invalid = [
      { ...dailyRow, log_date: '2026-11-02' }, { ...dailyRow, log_date: '2026-11-10' },
      { ...dailyRow, deleted_at: '2026-11-09' }, { ...dailyRow, player_id: 'other' },
    ];
    expect(flags(85, invalid)).toEqual(['weight_jump', 'no_logs']);
    expect(flags(85, [dailyRow])).not.toContain('no_logs');
    expect(dailyAverages('p', [{ ...dailyRow, log_date: '2026-11-10' }], new Date('2026-11-09T22:30:00Z')).count).toBe(1);
  });
  it('notes alone stay routine, whitespace is empty, and health flags need attention', () => {
    expect(triage({ ...item, notes: 'Read this' }, [], daily, now)).toEqual({ group: 'routine', flags: [{ key: 'note_present', values: {} }] });
    expect(triage({ ...item, notes: '  ' }, [], daily, now).flags).toEqual([]);
    expect(triage(item, [], [], now).group).toBe('attention');
  });
  it('orders by group, descending flag count, oldest first, without mutation', () => {
    const rows = [{ ...item, id: 'new' }, { ...item, id: 'routine', notes: 'note' }, { ...item, id: 'old', created_at: '2026-11-01' }, { ...item, id: 'few', created_at: '2026-10-01' }];
    const results = {
      new: triage(item, history, [], now), old: triage(item, history, [], now),
      routine: triage({ ...item, notes: 'note' }, [], daily, now),
      few: triage(item, [], [], now),
    };
    expect(orderTriage(rows, row => results[row.id as keyof typeof results]).map(row => row.id)).toEqual(['old', 'new', 'few', 'routine']);
    expect(rows[0]?.id).toBe('new');
  });
});

it.each(['ar', 'en'] as const)('renders translated groups, flags, filters and primary next action: %s', locale => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale },
    h('div', { dir: locale === 'ar' ? 'rtl' : 'ltr' },
      h(InboxGroups, { filter: 'all', onFilter: () => {}, children: [
        h('li', { key: 'a', 'data-group': 'attention' as const }, h(FlagChip, { flag: { key: 'low_sleep', values: { hours: 5.5 } } })),
        h('li', { key: 'b', 'data-group': 'routine' as const }, 'Ali'),
      ] }),
      h(ReplyBox, { item, onSend: () => {}, onSendNext: () => {} }))));
  expect(html).toContain(locale === 'ar' ? 'محتاج متابعة' : 'Needs attention');
  expect(html).toContain(locale === 'ar' ? 'متابعة عادية' : 'Routine');
  expect(html).toContain(locale === 'ar' ? 'ابعت وافتح اللي بعده' : 'Send and next');
  expect(html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
  expect(html).toMatch(/type="submit"[^>]*bg-lime/);
});

it('filters groups and shows an empty state for a group with no items', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(InboxGroups, {
    filter: 'attention', onFilter: () => {}, children: [h('li', { key: 'b', 'data-group': 'routine' as const }, 'Hidden player')],
  })));
  expect(html).not.toContain('Hidden player');
  expect(html).toContain('All caught up');
});

it('shows loading instead of provisional routine rows', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(InboxGroups, {
    filter: 'all', onFilter: () => {}, loading: true,
    children: [h('li', { key: 'b', 'data-group': 'routine' as const }, 'Unknown group')],
  })));
  expect(html).toContain('Loading inbox');
  expect(html).not.toContain('Unknown group');
});

it('shows signed locale deltas and averages, hiding missing prior measurements', () => {
  const render = (past: CheckinHistory[]) => renderToStaticMarkup(h(LocaleProvider, { locale: 'en' },
    h(CheckinDetail, { item, history: past, dailyChecks: daily, now })));
  expect(render(history)).toContain('-0.1 kg since 31 Oct');
  expect(render(history)).toContain('7-day sleep average');
  expect(render(history)).toContain('6 h');
  expect(render([])).not.toContain('kg since');
  expect(render([{ ...history[0], waist_cm: null }])).not.toContain('cm since');
});

type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
const clock = () => now;
const renderScreen = () => { hooks.cursor = 0; return InboxScreen({ now: clock }); };
const screenNodes = () => nodes(renderScreen());
const replyNode = () => screenNodes().find(node => node.type === ReplyBox);
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
it('Send and next waits for success, advances within its group and shows caught up', async () => {
  const routine: InboxItem = { ...item, id: 'routine', kind: 'form', note: null, exercise_name: 'Squat' };
  vi.mocked(listInbox).mockResolvedValue({ data: [item, { ...item, id: 'next' }, routine] });
  // Direct component invocation exercises handlers; translation hooks are supplied by React's real provider below.
  const i18n = await import('@/core/i18n/client');
  const translate = vi.spyOn(i18n, 'useT').mockReturnValue(key => key);
  const locale = vi.spyOn(i18n, 'useLocale').mockReturnValue('en');
  try {
    renderScreen(); hooks.effects.splice(0).forEach(effect => effect()); await flush();
    const select = screenNodes().find(node => node.type === InboxRow)?.props.onSelect as () => void;
    select();
    let resolve: (value: { data: true }) => void = () => {};
    vi.mocked(reviewItem).mockReturnValue(new Promise(done => { resolve = done; }));
    const operation = (replyNode()?.props.onSendNext as (reply: string) => Promise<void>)('Good');
    expect((replyNode()?.props.item as InboxItem).id).toBe('current');
    resolve({ data: true }); await operation;
    expect((replyNode()?.props.item as InboxItem).id).toBe('next');
    vi.mocked(reviewItem).mockResolvedValue({ data: true });
    await (replyNode()?.props.onSendNext as (reply: string) => Promise<void>)('Good');
    expect(replyNode()).toBeUndefined();
    expect(screenNodes().some(node => node.props.role === 'status' && node.props.children === 'caughtUp')).toBe(true);
    expect(screenNodes().filter(node => node.type === InboxRow).map(node => (node.props.item as InboxItem).id)).toEqual(['routine']);
  } finally { translate.mockRestore(); locale.mockRestore(); }
});

it('Send and next keeps the reply open after a save failure', async () => {
  vi.mocked(listInbox).mockResolvedValue({ data: [item, { ...item, id: 'next' }] });
  vi.mocked(reviewItem).mockResolvedValue({ error: 'offline' });
  const i18n = await import('@/core/i18n/client');
  const translate = vi.spyOn(i18n, 'useT').mockReturnValue(key => key);
  const locale = vi.spyOn(i18n, 'useLocale').mockReturnValue('en');
  try {
    renderScreen(); hooks.effects.splice(0).forEach(effect => effect()); await flush();
    (screenNodes().find(node => node.type === InboxRow)?.props.onSelect as () => void)();
    await (replyNode()?.props.onSendNext as (reply: string) => Promise<void>)('Keep draft');
    expect((replyNode()?.props.item as InboxItem).id).toBe('current');
    expect(screenNodes().filter(node => node.type === InboxRow)).toHaveLength(2);
    expect(screenNodes().some(node => node.props.role === 'alert')).toBe(true);
  } finally { translate.mockRestore(); locale.mockRestore(); }
});

it('keeps plain send available but hides send-and-next when triage inputs failed', async () => {
  const form: InboxItem = { ...item, id: 'form', kind: 'form', note: null, exercise_name: 'Squat' };
  vi.mocked(listInbox).mockResolvedValue({ data: [form, item] });
  vi.mocked(listTriageInputs).mockResolvedValueOnce({ error: 'loadFailed' });
  const i18n = await import('@/core/i18n/client');
  const translate = vi.spyOn(i18n, 'useT').mockReturnValue(key => key);
  const locale = vi.spyOn(i18n, 'useLocale').mockReturnValue('en');
  try {
    renderScreen(); hooks.effects.splice(0).forEach(effect => effect()); await flush();
    (screenNodes().find(node => node.type === InboxRow && (node.props.item as InboxItem).kind === 'form')?.props.onSelect as () => void)();
    expect(replyNode()?.props.onSendNext).toBeUndefined();
    expect(replyNode()?.props.disabled).toBe(false);
    expect(screenNodes().some(node => node.type === InboxRow)).toBe(true);
  } finally { translate.mockRestore(); locale.mockRestore(); }
});

const database = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('./data/client', () => ({ inboxClient: database.client }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
it('loads four check-ins per player and seven Cairo days in two RLS-scoped queries', async () => {
  const queries: Record<string, unknown[][]> = {};
  const query = (data: unknown) => {
    const chain: Record<string, unknown> = { then: (done: (result: unknown) => void) => Promise.resolve({ data, error: null }).then(done) };
    for (const method of ['select', 'in', 'eq', 'is', 'gte', 'lte', 'order', 'limit']) {
      chain[method] = (...args: unknown[]) => { (queries[method] ??= []).push(args); return chain; };
    }
    return chain;
  };
  const from = vi.fn((table: string) => query(table === 'profiles' ? [{ id: 'p', check_ins: history }] : daily));
  database.client.mockResolvedValue({ from, auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) } });
  const { listTriageInputs } = await vi.importActual<typeof TriageData>('./data/triage-inputs');
  const id = '019a0000-0000-7000-8000-000000000001';
  expect(await listTriageInputs([id, id], now.toISOString())).toEqual({ data: { history, dailyChecks: daily } });
  expect(from.mock.calls).toEqual([['profiles'], ['daily_checks']]);
  expect(queries.limit).toContainEqual([4, { referencedTable: 'check_ins' }]);
  expect(queries.eq).toContainEqual(['check_ins.captain_id', 'captain']);
  expect(queries.gte).toContainEqual(['log_date', '2026-11-03']);
  expect(queries.lte).toContainEqual(['log_date', '2026-11-09']);
  expect(queries.is).toContainEqual(['deleted_at', null]);
  expect(queries.in).toEqual([['id', [id]], ['player_id', [id]]]);
});
