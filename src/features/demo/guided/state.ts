import { steps } from './steps';
import type { Page, PhoneTab } from './steps';

export type Thread = 'mohamed' | 'sara' | 'omar';
export type ChatMessage = { from: 'captain' | 'player'; text: string };
export function initialState(now: number) {
  return {
    intro: true, n: 18, started: now, ended: null as number | null, step: 0,
    page: 'home' as Page, view: 'captain' as 'captain' | 'player', guide: 'open' as 'open' | 'min' | 'closed',
    did: [] as string[], nudged: false, approved: false, joined: false, renewed: false, paid: false,
    invite: false, invites: [] as string[], name: '', pkg: 1, gate: true, initial: true, photos: true,
    chat: 'mohamed' as Thread, threads: { mohamed: [], sara: [], omar: [] } as Record<Thread, ChatMessage[]>,
    tab: 'workout' as PhoneTab, kg: 65, reps: 8, sets: [[60, 10], [62.5, 8]] as [number, number][], restUntil: 0,
    unread: 0, eaten: [true, false, false, false], swap: 0, day: 0, added: [] as string[], feed: [] as { event: string; text: string }[],
  };
}
export type DemoState = ReturnType<typeof initialState>;
export type Action =
  | { type: 'start'; n: number; now: number }
  | { type: 'restart' | 'next' | 'prev'; now: number }
  | { type: 'event'; event: string; now: number; text?: string }
  | { type: 'go'; page: Page; now: number }
  | { type: 'phone'; tab: PhoneTab; now: number }
  | { type: 'patch'; patch: Partial<Pick<DemoState, 'guide' | 'view' | 'kg' | 'reps' | 'restUntil' | 'day' | 'chat' | 'name' | 'pkg' | 'gate' | 'initial' | 'photos'>> }
  | { type: 'eat'; index: number }
  | { type: 'edit-set'; index: number; kg: number; reps: number };

function move(state: DemoState, index: number, now: number): DemoState {
  const step = Math.max(0, Math.min(12, index));
  const item = steps[step];
  if (!item) return state;
  return { ...state, step, page: item.page, view: item.view ?? 'captain',
    chat: step === 5 ? 'mohamed' : state.chat, tab: step === 11 ? 'workout' : state.tab,
    ended: step === 12 ? state.ended ?? now : state.ended };
}
export function reduceDemo(state: DemoState, action: Action): DemoState {
  if (action.type === 'restart') return initialState(action.now);
  if (action.type === 'start') return { ...initialState(action.now), n: action.n, intro: false };
  if (action.type === 'next' || action.type === 'prev') return move(state, state.step + (action.type === 'next' ? 1 : -1), action.now);
  if (action.type === 'patch') return { ...state, ...action.patch };
  if (action.type === 'edit-set') return { ...state, sets: state.sets.map((set, index) => index === action.index ? [action.kg, action.reps] : set) };
  if (action.type === 'eat') return { ...state, eaten: state.eaten.map((v, i) => i === action.index ? !v : v), did: [...new Set([...state.did, `eat:${action.index}`])] };
  if (action.type === 'phone') return { ...state, tab: action.tab, unread: action.tab === 'coach' ? 0 : state.unread, did: [...new Set([...state.did, `ptab:${action.tab}`])] };
  if (action.type === 'go') return reduceDemo({ ...state, page: action.page }, { type: 'event', event: `go:${action.page}`, now: action.now });
  if (action.type !== 'event') return state;
  const { event, text, now } = action;
  if ((event === 'send' || event === 'reply') && !text?.trim()) return state;
  let next = { ...state, did: [...new Set([...state.did, event])] };
  const addFeed = () => { next.feed = [{ event, text: event === 'set' ? `${state.kg} × ${state.reps}` : text ?? state.name }, ...state.feed]; };
  if (event === 'nudge' && !state.nudged) {
    next.nudged = true; next.threads = { ...state.threads, omar: [...state.threads.omar, { from: 'captain', text: text ?? '' }] }; addFeed();
  }
  if (event === 'renew' && !state.renewed) { next.renewed = true; addFeed(); }
  if (event === 'approve' && !state.approved) {
    next.approved = true; next.threads = { ...state.threads, sara: [...state.threads.sara, { from: 'captain', text: text ?? '' }] }; addFeed();
  }
  if (event === 'joinok' && !state.joined) { next.joined = true; addFeed(); }
  if (event === 'pay' && !state.paid) { next.paid = true; addFeed(); }
  if (event === 'invite' && !state.invite) { next.invite = true; next.invites = [...state.invites, text ?? state.name]; next.name = text ?? state.name; addFeed(); }
  if (event === 'again') { next.invite = false; next.name = ''; }
  if (event === 'swap') next.swap = state.swap === 1 ? 2 : 1;
  if (event === 'addex' && text) next.added = [...state.added, text];
  if ((event === 'send' || event === 'reply') && text?.trim()) {
    const chat = event === 'reply' ? 'mohamed' : state.chat;
    next.threads = { ...state.threads, [chat]: [...state.threads[chat], { from: event === 'send' ? 'captain' : 'player', text: text.trim() }] };
    if (event === 'send' && chat === 'mohamed') next.unread = state.tab === 'coach' ? 0 : state.unread + 1;
  }
  if (event === 'set') { next.sets = [...state.sets, [state.kg, state.reps]]; next.restUntil = now + 90000; addFeed(); }
  if (state.guide !== 'closed' && steps[state.step]?.event === event) next = move(next, state.step + 1, now);
  return next;
}
export const scaled = (n: number) => ({ players: n, trained: Math.round(n * .78) });
export const planIndex = (n: number) => n <= 5 ? 0 : n <= 20 ? 1 : n <= 40 ? 2 : 3;
export function summary(state: DemoState, now: number) {
  const seconds = Math.max(1, Math.round(((state.ended ?? now) - state.started) / 1000));
  return { actions: state.did.length, elapsed: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, players: state.n };
}
