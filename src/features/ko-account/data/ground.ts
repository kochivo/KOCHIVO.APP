import { clarifyIntent } from './intents';
import type { Intent } from './intents';

const arabicNumbers = [
  'واحد واحدة', 'اتنين اثنين اثنان تنين', 'تلات تلاتة ثلاث ثلاثة', 'اربع اربعة',
  'خمس خمسة', 'ست ستة', 'سبع سبعة', 'تمان تمانية ثمان ثمانية', 'تسع تسعة', 'عشر عشرة',
  'حداشر احدعشر', 'اتناشر اثناعشر اثنيعشر', 'تلتاشر تلاتاشر ثلاثةعشر',
  'اربعتاشر اربعةعشر', 'خمستاشر خمسةعشر', 'ستاشر ستةعشر', 'سبعتاشر سبعةعشر',
  'تمنتاشر تمانتاشر ثمانيةعشر', 'تسعتاشر تسعةعشر', 'عشرين عشرون',
];
const numberWords = new Map(arabicNumbers.flatMap((words, index) =>
  words.split(' ').map(word => [word, index + 1] as const)));
const relative = new Set(['زود', 'قلل', 'شوية', 'more', 'less']);
const absolute = new Set(['to', 'الى', 'ل', 'لحد', 'خلي', 'خليه', 'خليها']);
const genericExercises = new Set(['التمرين', 'تمرين', 'exercise', 'the exercise']);
const dayUnits = new Set(['يوم', 'ايام', 'day', 'days', 'yom']);
const weekUnits = new Set(['اسابيع', 'weeks']);
const monthUnits = new Set(['شهور', 'اشهر', 'months']);
const englishNumbers = new Map(
  'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
    .split(' ').map((word, index) => [word, index + 1] as const),
);
const periods = new Map([
  ['يوم', 1], ['day', 1], ['يومين', 2], ['يومان', 2],
  ['اسبوع', 7], ['week', 7], ['اسبوعين', 14], ['اسبوعان', 14], ['شهر', 30], ['month', 30],
  ['شهرين', 60], ['شهران', 60], ['سنة', 365], ['عام', 365], ['year', 365],
]);
const injuryWords = {
  knee: new Set(['ركبة', 'ركبتي', 'ركب', 'knee', 'rokba']),
  shoulder: new Set(['كتف', 'كتفي', 'اكتاف', 'shoulder', 'kitf']),
  lower_back: new Set(['ضهر', 'ظهر', 'ضهري', 'ظهري', 'back', 'dahr']),
};
const paymentWords = new Set(['دفع', 'دافع', 'فلوس', 'مستحقات', 'فلوسه', 'بيدفع', 'pay', 'paid', 'money', 'dues', 'owes']);
const otherCaptainPhrases = new Set(['كابتن تاني', 'مدرب تاني', 'another coach', 'other captain', 'other coach']);

function normalize(text: string) {
  return text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ـ\u064b-\u065f]/g, '')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)))
    .replace(/(?<!\p{L})(احد|اثنا|اثني|ثلاثة|اربعة|خمسة|ستة|سبعة|ثمانية|تسعة)\s+عشر(?!\p{L})/gu, '$1عشر');
}

function numberValue(token: string | undefined) {
  if (token === undefined) return undefined;
  return /^[+-]?\d+(?:[.,٫]\d+)*$/.test(token)
    ? Number(token.replace('٫', '.')) : numberWords.get(token) ?? numberWords.get(token.replace(/^و/, ''));
}

function durationNumber(token: string | undefined) {
  return token === undefined ? undefined : numberValue(token) ?? englishNumbers.get(token);
}

function stripArabicPrefixes(token: string) {
  return token.replace(/^[وف]?(?:بال|لل|ال)|^و/, '');
}

function updateValues(tokens: string[]) {
  if (!tokens.some(token => relative.has(token))) return tokens.map(numberValue);
  return tokens.flatMap((token, index) => {
    if (absolute.has(token) || absolute.has(token.replace(/^و/, ''))) return [numberValue(tokens[index + 1])];
    if (token.startsWith('ل')) return [numberValue(token.slice(1))];
    return [];
  });
}

function durations(tokens: string[], text: string) {
  const answer = text.match(/(?:كام|كم|how many)\s+(?:يوم|ايام|days?)\s*[؟?][^\S\n]*\n\s*(.+)$/u)?.[1];
  const answerDays = durationNumber(answer?.trim());
  if (answerDays !== undefined) return [answerDays];
  return tokens.flatMap((word, index) => {
    const token = word.replace(/^و?ل|^و/, '');
    const prior = tokens[index - 1];
    const previous = durationNumber(prior);
    if (dayUnits.has(token) && previous !== undefined) return [previous];
    if (prior === 'كام' || prior === 'كم' || prior === 'many') return [];
    if (weekUnits.has(token)) return previous !== undefined && Number.isInteger(previous) && previous > 0 ? [previous * 7] : [];
    if (monthUnits.has(token)) return previous !== undefined && Number.isInteger(previous) && previous >= 1 && previous <= 12
      ? [previous * 30] : [];
    const days = periods.get(token);
    return days === undefined || (previous !== undefined && previous !== 1) ? [] : [days];
  });
}

export function groundIntent(intent: Intent, text: string): Intent;
export function groundIntent(intents: Intent[], text: string): Intent | null;
export function groundIntent(intent: Intent | Intent[], text: string): Intent | null {
  // The single-request eval scores the first call.
  if (Array.isArray(intent)) return intent[0] ? groundIntent(intent[0], text) : null;
  const normalized = normalize(text);
  const tokens = normalized.match(/[+-]?\d+(?:[.,٫]\d+)*|\p{L}+/gu) ?? [];
  switch (intent.kind) {
    case 'swap_exercise': {
      const { reason = 'injury', injury } = intent.args;
      if (reason !== 'injury') return intent;
      return injury && tokens.some(token => injuryWords[injury].has(stripArabicPrefixes(token)))
        ? intent : clarifyIntent(intent.kind);
    }
    case 'team_summary':
    case 'player_summary': {
      const words = tokens.map(stripArabicPrefixes);
      if (words.some(word => paymentWords.has(word))) return clarifyIntent('unsupported_payments');
      if (words.some((word, index) => otherCaptainPhrases.has(word + ' ' + words[index + 1])))
        return clarifyIntent('other_captain');
      return intent;
    }
    case 'update_exercise': {
      const { exercise, sets, reps } = intent.args;
      const values = updateValues(tokens);
      if (genericExercises.has(normalize(exercise).trim().replace(/\s+/g, ' ')) ||
          (sets === undefined && reps === undefined) ||
          (sets !== undefined && !values.includes(sets)) ||
          (reps !== undefined && !values.includes(reps))) return clarifyIntent(intent.kind);
      return intent;
    }
    case 'renew_subscription': {
      const days = durations(tokens, normalized);
      return days.length && days.every(value => value === intent.args.days) ? intent : clarifyIntent(intent.kind);
    }
    case 'create_nutrition':
      return Object.values(intent.args.targets).every(target => tokens.some(token => numberValue(token) === target))
        ? intent : clarifyIntent(intent.kind);
    default:
      return intent;
  }
}
