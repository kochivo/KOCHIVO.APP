import type { AnswerSource } from '@/features/ko-core';
import type { Intent } from './intents';

export function latinDigits(text: string) {
  return text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit =>
    String(digit.charCodeAt(0) - (digit.charCodeAt(0) < 0x6f0 ? 0x660 : 0x6f0)));
}

const phone = /(?<![\d-])\+?\d(?:[ ().-]*\d){6,}(?![\d-])/g;
const link = /(?:\b(?:https?|ftp|mailto|tel):[^\s]+|[\p{L}\d._%+-]+@[\p{L}\d.-]+|[\p{L}\d_-]+(?:\.[\p{L}\d_-]+)*\.[\p{L}]{2,}(?:\/[^\s]*)?)/giu;
export const privateContact = new RegExp(link.source + '|' + phone.source, 'giu');
const actionClaim = /(?<!\p{L})[وف]?(?:حفظت|سجلت|اتسجل|غيرت|عدلت)\p{L}*|(?<!\p{L})تم\s+(?:الحفظ|التسجيل|التغيير|التعديل)(?!\p{L})|\b(?:I|we)\s+(?:have\s+)?(?:saved|logged|updated|changed)\b|(?:^|[.!?]\s+)(?:saved|logged|updated|changed)(?:[.!?]|$)|\b(?:has|have)\s+been\s+(?:saved|logged|updated|changed)\b|\b(?:saved|logged|updated|changed)\s+(?:successfully|for you)\b/iu;
const isoDate = /\b\d{4}-\d{2}-\d{2}\b/g;

function numbers(text: string) {
  return (latinDigits(text).replace(/(?<=\d)[٬,](?=\d{3}(?!\d))/g, '').replace(/٫/g, '.')
    .match(/(?:(?<!\d)[+-])?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
}

// A facts line starts with `[<source>] ` (facts.ts: one line per source, values
// joined with `; `). Only numbers from lines whose source the answer cites can
// justify a number in the answer, so a number from another source — or from an
// unprefixed line — never counts. Within one cited line numbers are allowed as
// a set: the lines mix several fields in free prose (see Notes for reviewer),
// so key-aware matching inside a line is not attempted here.
function citedNumbers(facts: string, sources: readonly AnswerSource[]) {
  const cited = new Set<string>(sources);
  const allowed = new Set<number>();
  for (const line of facts.split('\n')) {
    const match = /^\[([^\]]+)\] /.exec(line);
    if (match && match[1] && cited.has(match[1])) {
      for (const value of numbers(line)) allowed.add(value);
    }
  }
  return allowed;
}

// userText stays in the signature so callers keep passing the question, but its
// numbers never justify an answer: echoing a number the user asked about is
// not evidence for it.
export function guardAnswer(text: string, facts: string, userText: string, sources: readonly AnswerSource[]) {
  if (!text.trim() || text.length > 700) return 'length';
  const normalized = latinDigits(text.normalize('NFKC').replace(/[\p{Cf}\u0640\u064b-\u065f]/gu, ''));
  if (normalized.match(link)) return 'link';
  if (normalized.replace(isoDate, '').match(phone)) return 'phone';
  if (actionClaim.test(normalized)) return 'action_claim';
  const allowed = citedNumbers(facts, sources);
  return numbers(normalized).some(value => !(Number.isInteger(value) && value >= 0 && value <= 10) && !allowed.has(value))
    ? 'number' : null;
}

export const fallbackBySource = {
  me: { kind: 'clarify', args: { question: '' }, reason: 'answer' },
  workout_today: { kind: 'my_workout', args: { day: 'today' } },
  workout_tomorrow: { kind: 'my_workout', args: { day: 'tomorrow' } },
  nutrition_today: { kind: 'read_nutrition', args: {} },
  progress: { kind: 'my_progress', args: {} },
  captain: { kind: 'clarify', args: { question: '' }, reason: 'answer' },
  team_summary: { kind: 'team_summary', args: {} },
  player_summary: { kind: 'player_summary', args: {} },
} as const satisfies Record<AnswerSource, Intent>;

function answerInFacts(source: AnswerSource, facts: string) {
  return facts.split('\n').some(line => line.startsWith('[' + source + '] '));
}

export function reviewAnswer(args: Extract<Intent, { kind: 'answer' }>['args'], facts: string, userText: string) {
  const reason = guardAnswer(args.text, facts, userText, args.sources) ??
    (args.sources.some(source => !answerInFacts(source, facts)) ? 'source' : null);
  if (!reason) return { ok: true as const, ...args };
  const first = args.sources[0];
  const fallback: Intent = first ? fallbackBySource[first]
    : { kind: 'clarify', args: { question: '' }, reason: 'answer' };
  return { ok: false as const, reason, fallback };
}
