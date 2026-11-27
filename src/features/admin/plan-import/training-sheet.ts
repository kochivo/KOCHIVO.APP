import { sheetNumber } from './sheet-values';
import type { Sheet } from './sheet-values';

export type SheetExercise = {
  name: string; sets: number; repsMin: number; repsMax: number | null; rest: number | null;
  rirs: (number | null)[]; rirText: string; warmup: string; muscle: string; note: string;
};
type WarmupItem = { name: string; amount: number; note: string };
type TrainingDay = { name: string; exercises: SheetExercise[]; warmup: WarmupItem[] };
export type TrainingSheet = { weeks: number; days: TrainingDay[] };

function exerciseFromRow(row: string[]): SheetExercise {
  const [, name = '', setsText, rirText = '', reps = '', warmup = '', , , , , restText = '', , , note = ''] = row;
  const sets = sheetNumber(setsText, 1, 20, true);
  const failure = /^(failure|للفشل)$/i.test(reps);
  const [minimum, maximum = minimum] = reps.split(/\s*[-–]\s*/);
  const repsMin = failure ? 1 : sheetNumber(minimum, 1, 100, true);
  const repsMax = failure ? null : sheetNumber(maximum, repsMin, 100, true);
  if (!failure && !/^\d+(?:\s*[-–]\s*\d+)?$/.test(reps)) throw new Error('invalidNumber');
  const entries = rirText.split(/\s*[-–]\s*/);
  const perSet = entries.length === sets && entries.every(value => /^[0-5]$/.test(value));
  // A single target in the sheet applies to every working set.
  const valid = rirText === '' || /^[0-5]$/.test(rirText) || perSet;
  const rirs = Array.from({ length: sets }, (_, index) => perSet ? Number(entries[index])
    : /^[0-5]$/.test(rirText) ? Number(rirText) : /^[0-5]$/.test(entries[index] ?? '') ? Number(entries[index]) : null);
  const rest = restText ? sheetNumber(restText, 0, 900, true) : null;
  if (rest !== null && rest % 15 !== 0) throw new Error('invalidRest');
  return { name, sets, repsMin, repsMax, rirs, rirText: valid ? '' : rirText, warmup, rest, muscle: row[27] ?? '', note };
}

function generalWarmup(rows: string[][]) {
  const phase = rows.findIndex(row => /phase\s+1.*upper/i.test(row[0] ?? '') && /phase\s+1.*lower/i.test(row[5] ?? ''));
  const items: { upper: WarmupItem[]; lower: WarmupItem[] } = { upper: [], lower: [] };
  if (phase < 0) return items;
  for (const row of rows.slice(phase + 2)) {
    if (/phase\s+2/i.test(row[0] ?? '')) break;
    for (const [part, ordinalCol, nameCol, repsCol, levelCol] of [
      ['upper', 0, 1, 2, 4], ['lower', 5, 6, 12, 14],
    ] as const) {
      const name = row[nameCol], reps = row[repsCol];
      const amount = Number(reps?.match(/^(\d+)\s+reps?\b/i)?.[1]);
      if (/^\d+(?:\.0)?$/.test(row[ordinalCol] ?? '') && name && name.length <= 60 && amount >= 1 && amount <= 999) {
        const note = [reps, row[levelCol]].filter(Boolean).join(' · ');
        if (note.length <= 80) items[part].push({ name, amount, note });
      }
    }
  }
  return items;
}

function parseWeek({ rows }: Sheet): TrainingDay[] {
  const header = rows.findIndex(row => /^(التمرين|exercise)$/i.test(row[1] ?? '')
    && /المجاميع|sets/i.test(row[2] ?? '') && row[3]?.toUpperCase() === 'RIR');
  if (header < 0) throw new Error('unknownFormat');
  const days: TrainingDay[] = [];
  const warmup = generalWarmup(rows);
  for (const row of rows.slice(header + 1)) {
    const name = row[1];
    if (!name) continue;
    if (/weekly training volume|حجم التدريب/i.test(name)) break;
    if (!row[2] && !row[3] && !row[4] && !row[5]) {
      const items = /^torso\b/i.test(name) ? warmup.upper : /^limbs\b/i.test(name) ? warmup.lower : [];
      days.push({ name, exercises: [], warmup: items });
    } else {
      const day = days.at(-1);
      if (!day) throw new Error('invalidDay');
      day.exercises.push(exerciseFromRow(row));
    }
  }
  if (!days.length || days.some(day => !day.exercises.length)) throw new Error('invalidDay');
  return days;
}

export function parseTrainingSheets(sheets: Sheet[]): TrainingSheet {
  const weeks = sheets.filter(sheet => /^week\s+\d+$/i.test(sheet.name))
    .sort((a, b) => Number(a.name.match(/\d+/)?.[0]) - Number(b.name.match(/\d+/)?.[0]));
  if (!weeks.length || weeks.length > 12 || weeks.some((sheet, index) => Number(sheet.name.match(/\d+/)?.[0]) !== index + 1)) {
    throw new Error('unknownFormat');
  }
  const [days, ...others] = weeks.map(parseWeek);
  const prescription = (schedule: TrainingDay[]) => JSON.stringify(schedule.map(day => ({
    ...day, exercises: day.exercises.map(exercise => ({ ...exercise, note: '' })),
  })));
  if (!days || others.some(week => prescription(week) !== prescription(days))) throw new Error('differentWeeks');
  return { days, weeks: weeks.length };
}
