import { expect, it } from 'vitest';
import { matchNamed } from './data/match';

const rows = [
  { name_ar: 'سكوات بالبار', name_en: 'Barbell squat' },
  { name_ar: 'سكوات دمبل', name_en: 'Dumbbell squat' },
  { name_ar: 'بنش', name_en: 'Bench press' },
];

it('resolves exact bilingual names and keeps ambiguous exercises ambiguous', () => {
  expect(matchNamed(rows, 'السِّكوات بالبار')).toEqual([rows[0]]);
  expect(matchNamed(rows, 'bench press')).toEqual([rows[2]]);
  expect(matchNamed(rows, 'سكوات')).toEqual(rows.slice(0, 2));
  expect(matchNamed(rows, 'curl')).toEqual([]);
});
