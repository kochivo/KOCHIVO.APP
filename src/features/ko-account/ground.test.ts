import { afterEach, expect, it, vi } from 'vitest';
import * as entry from '@/features/ko-entry/server';
import * as account from './data/account';
import type { KoActor } from './data/account';
import * as executor from './data/execute';
import { groundIntent } from './data/ground';
import type { Intent } from './data/intents';
import { postKoAccountChat } from './data/route';
import type * as UsageModule from './data/usage';
vi.mock('./data/usage', async original => ({ ...await original<typeof UsageModule>(), takeUsage: async () => 'ok' }));

vi.mock('server-only', () => ({}));

const update = (args: Partial<Extract<Intent, { kind: 'update_exercise' }>['args']>): Intent =>
  ({ kind: 'update_exercise', args: { exercise: 'Bench', ...args } });
const renew = (days: number): Intent => ({ kind: 'renew_subscription', args: { player: 'يوسف', days } });
const swap = (injury: NonNullable<Extract<Intent, { kind: 'swap_exercise' }>['args']['injury']>): Intent =>
  ({ kind: 'swap_exercise', args: { exercise: 'Bench', reason: 'injury', injury } });
const training: Intent = { kind: 'create_training', args: {
  player: 'محمود', title: 'برنامج محمود', days: 3,
} };
const nutrition: Intent = { kind: 'create_nutrition', args: {
  title: 'Meal plan', targets: { kcal: 2200, protein: 120, carbs: 250, fat: 80 }, meals: [],
} };

it.each<[string, Intent]>([
  ['زود البنش ليوسف شوية', update({})],
  ['زود مجموعة في السكوات لمنة', update({ exercise: 'Squat', sets: 1 })],
  ['خلي التمرين 4 مجموعات', update({ exercise: 'التمرين', sets: 4 })],
  ['زود البنش 4 مجموعات', update({ sets: 4 })],
  ['خلي البنش 4 مجموعات', update({ sets: 4, reps: 10 })],
  ['خلي البنش 14 مجموعة', update({ sets: 4 })],
  ['جدد اشتراك يوسف', renew(30)],
  ['جدد اشتراك يوسف شهر', renew(31)],
  ['جدد اشتراك يوسف شهرين', renew(30)],
  ['جدد اشتراك يوسف 2 month', renew(30)],
  ['جدد لمحمود أسبوعين', renew(7)],
  ['جدد لمحمود ٣ أسابيع', renew(28)],
  ['جدد لمحمود 13 شهر', renew(30)],
  ['جدد لمحمود 13 months', renew(365)],
  ['رسغي بيوجعني في البنش', swap('shoulder')],
  ['My shoulder blade hurts', swap('knee')],
  ['I hurt my backbone', swap('lower_back')],
  ['سعرات 22000', nutrition],
  ['نظام أكل 2200 سعر لمنة', nutrition],
])('asks for clarification for %s', (text, intent) => {
  expect(groundIntent(intent, text)).toEqual({ kind: 'clarify', args: { question: '' }, reason: intent.kind });
});

it.each<[string, Intent]>([
  ['خلي البنش ليوسف 4 مجموعات', update({ sets: 4 })],
  ['زود البنش لـ٤ مجموعات', update({ sets: 4 })],
  ['زود البنش وخليه 4 مجموعات', update({ sets: 4 })],
  ['خلي البنش أربعة مجموعات', update({ sets: 4 })],
  ['خلي البنش تلاتة مجموعات وعشرة عدات', update({ sets: 3, reps: 10 })],
  ['جدد اشتراك يوسف شهر', renew(30)],
  ['جدد اشتراك يوسف لشهر', renew(30)],
  ['جدد اشتراك يوسف شهرين', renew(60)],
  ['جدد اشتراك يوسف تلات شهور', renew(90)],
  ['جدد لمحمود أسبوعين', renew(14)],
  ['جدد لمحمود لاسبوعين', renew(14)],
  ['Renew Mahmoud for two weeks', renew(14)],
  ['جدد لمحمود ٣ أسابيع', renew(21)],
  ['جدد لمحمود أربع اسابيع', renew(28)],
  ['Renew Mahmoud for four weeks', renew(28)],
  ['جدد لمحمود ٢ شهور', renew(60)],
  ['جدد لمحمود اثني عشر أشهر', renew(360)],
  ['Renew Mahmoud for one month', renew(30)],
  ['Renew Mahmoud for six months', renew(180)],
  ['Renew Mahmoud for five days', renew(5)],
  ['جدد ليوسف 45 يوم', renew(45)],
  ['gadded le youssef 30 yom', renew(30)],
  ['أجدد ليوسف كام يوم؟\nشهر', renew(30)],
  ['أجدد ليوسف كام يوم؟\n٤٥', renew(45)],
  ['برنامج لمحمود 3 أيام', training],
  ['سعرات 2200 بروتين 120 كارب 250 دهون 80', nutrition],
  ['الوجع في أنهي حتة بالظبط؟\nالركبة', swap('knee')],
  ['My rokba hurts', swap('knee')],
  ['وجع بالكتف في البنش', swap('shoulder')],
  ['My kitf hurts', swap('shoulder')],
  ['ضهري بيوجعني في البنش', swap('lower_back')],
  ['My dahr hurts', swap('lower_back')],
  ['جهاز البنش مشغول', { kind: 'swap_exercise', args: { exercise: 'Bench', reason: 'busy' } }],
  ['مين ما تمرنش الأسبوع ده؟', { kind: 'team_summary', args: {} }],
  ['Did Ahmed make progress?', { kind: 'player_summary', args: { player: 'Ahmed' } }],
])('preserves grounded intent for %s', (text, intent) => {
  expect(groundIntent(intent, text)).toBe(intent);
});

it.each([
  ['team_summary', 'مين دفع ومين لسه عليه فلوس؟', 'unsupported_payments'],
  ['team_summary', 'مين عليه فلوس؟', 'unsupported_payments'],
  ['player_summary', 'عايز أعرف فلوسه', 'unsupported_payments'],
  ['player_summary', 'هل يوسف دفع المستحقات؟', 'unsupported_payments'],
  ['player_summary', 'Show me who paid', 'unsupported_payments'],
  ['team_summary', 'وريني لاعيبة الكابتن التاني', 'other_captain'],
  ['player_summary', 'عايز تفاصيل لاعب عند مدرب تاني', 'other_captain'],
  ['team_summary', 'Show me the other captain’s players', 'other_captain'],
  ['player_summary', 'Ahmed trains with another coach', 'other_captain'],
] as const)('clarifies unsupported %s request %s', (kind, text, reason) => {
  expect(groundIntent({ kind, args: {} }, text)).toEqual({ kind: 'clarify', args: { question: '' }, reason });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const actorId = '22222222-2222-4222-8222-222222222222';
const actor = { id: actorId, role: 'captain', db: {
  rpc: async () => ({ data: true, error: null }),
} } as unknown as KoActor;

it.each([
  ['مين دفع ومين لسه عليه فلوس؟', 'ar', 'KO لسه مش بيعرض الفلوس والمدفوعات. شوفها من صفحة الاشتراكات والمدفوعات.'],
  ['Show me the other captain’s players', 'en', 'KO only shows your own players.'],
] as const)('resolves the fixed summary clarification for %s', async (text, locale, expected) => {
  const intent = groundIntent({ kind: 'team_summary', args: {} }, text);
  expect(await executor.executeIntent(actor, intent, locale, 'unused', 1_800_000_000_000))
    .toEqual({ kind: 'message', text: expected });
});

it.each(['audio', 'question', 'old user value', 'old KO question', 'KO statement'] as const)(
  'grounds only text and the preceding KO question (%s)', async mode => {
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    vi.spyOn(account, 'getKoActor').mockResolvedValue(actor);
    vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
      origin: new URL('https://ko.test'), pilots: new Set([actorId]), secret: 's'.repeat(32), key: 'key',
    });
    const args = { player: 'Ahmed', exercise: 'Bench', sets: 4 };
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ candidates: [{ content: {
      parts: [{ functionCall: { name: 'update_exercise', args } }],
    } }] })));
    const execute = vi.spyOn(executor, 'executeIntent');
    if (mode === 'audio' || mode === 'question') execute.mockResolvedValue({
      kind: 'message', text: '', actions: [{ id: 'action', title: 'Title', detail: 'Preview', token: 'test' }],
    });
    const form = new FormData();
    form.set('locale', 'en');
    if (mode === 'audio') form.set('audio', new Blob(['audio'], { type: 'audio/webm' }), 'request.webm');
    else form.set('text', 'Ahmed');
    const history = [{ role: 'user', text: 'Set Bench to 4 sets' }];
    if (mode === 'question') history.push({ role: 'ko', text: 'Which player should have 4 sets on Bench?' });
    if (mode === 'old KO question') history.push({ role: 'ko', text: 'Which player should have 4 sets on Bench?' },
      { role: 'user', text: 'Let me check' });
    if (mode === 'KO statement') history.push({ role: 'ko', text: 'The plan has 4 sets.' });
    form.set('history', JSON.stringify(history));
    const response = await postKoAccountChat(new Request('https://ko.test/api/ko', { method: 'POST', body: form,
      headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
    }));
    expect(response.status).toBe(200);
    if (mode === 'audio' || mode === 'question') {
      expect(await response.json()).toMatchObject({ kind: 'message', actions: [{ token: 'test' }] });
      expect(execute.mock.calls[0]?.[1]).toEqual({ kind: 'update_exercise', args });
    } else {
      expect(await response.json()).toEqual({ kind: 'message', text: 'Which exercise, and what exact sets or reps should it have?' });
    }
  },
);
