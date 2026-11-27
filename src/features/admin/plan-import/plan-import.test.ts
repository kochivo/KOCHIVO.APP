import { describe, expect, it } from 'vitest';
import { parseNutritionSheet } from './nutrition-sheet';
import { parseTrainingSheets } from './training-sheet';
import { cellDisplay } from './xlsx-cell-format';

const nutrition = [
  ['', 'الصنف  |  FOOD', 'الكمية', 'الوحدة', 'القيم الغذائية  |  MACROS', '', '', '', 'ملاحظات'],
  ['', '', '', '', 'السعرات\nKCAL', 'بروتين', 'كارب', 'دهون'],
  ['MEAL 1 • BREAKFAST | الفطار'],
  ['1', 'لبن', '400', 'مل', '138', '13', '18', '1.6', 'جهينة'],
  ['2', 'بيض', '5', 'حبة', '387.5', '31.5', '2.8', '26.5'],
  ['إجمالي الوجبة | MEAL TOTAL', '', '', '', '525.5'],
];

const week = {
  name: 'Week 1',
  rows: [
    ['', 'التمرين', 'المجاميع الفعلية', 'RIR', 'العدات', 'مجاميع التسخين', '', '', '', '', 'الراحة'],
    ['', 'TORSO A'],
    ['', 'Press', '2', '2-0', '8-10', '2-1', '85 lb', '8', '95', '9', '', '', '✔'],
    ['', 'CORE'],
    ['', 'Pallof Press', '2', '1,2-0', 'FAILURE', '2-1'],
    ['', 'WEEKLY TRAINING VOLUME | SETS', '55', '', '', '', '', 'KNEE REHAB'],
  ],
};

describe('admin workbook import', () => {
  it('keeps portion units and macros and skips meal subtotals', () => {
    expect(parseNutritionSheet(nutrition).meals).toEqual([{ name: 'الفطار', items: [
      { name: 'لبن', amount: 400, unit: 'ml', kcal: 138, protein: 13, carbs: 18, fat: 1.6, note: 'جهينة' },
      { name: 'بيض', amount: 5, unit: 'piece', kcal: 387.5, protein: 31.5, carbs: 2.8, fat: 26.5, note: '' },
    ] }]);
  });

  it('rejects an incomplete food row instead of dropping it', () => {
    const rows = nutrition.map((row, index) => index === 3
      ? row.map((value, column) => column === 4 ? '' : value) : row);
    expect(() => parseNutritionSheet(rows)).toThrow();
  });

  it('collapses identical weeks, keeps ordered set targets and ignores logged results', () => {
    const copy = { name: 'Week 2', rows: week.rows.map((row, index) => index === 2
      ? row.map((value, column) => [6, 9].includes(column) ? '' : value) : row) };
    expect(parseTrainingSheets([copy, week])).toMatchObject({
      weeks: 2, days: [
        { name: 'TORSO A', exercises: [{ name: 'Press', sets: 2, repsMin: 8, repsMax: 10, rirs: [2, 0], rest: null }] },
        { name: 'CORE', exercises: [{ name: 'Pallof Press', sets: 2, repsMax: null, rirs: [null, 0], rirText: '1,2-0' }] },
      ],
    });
    expect(parseTrainingSheets([week]).days[0]?.exercises[0]).not.toHaveProperty('weight');
  });

  it('refuses to flatten different planned weeks', () => {
    const copy = { name: 'Week 2', rows: week.rows.map((row, index) => index === 2
      ? row.map((value, column) => column === 4 ? '6-8' : value) : row) };
    expect(() => parseTrainingSheets([week, copy])).toThrow('differentWeeks');
  });

  it('retains a source date and percentage in readable form', () => {
    expect(cellDisplay('46085', 'n', 164, 'd-m', false)).toBe('2026-03-04');
    expect(cellDisplay('0.2647058824', null, 9, '0%', false)).toBe('26%');
    expect(cellDisplay('85LB', 's', 0, '', false)).toBe('85LB');
  });

  it('keeps the programmed upper-body warmup separate from working sets', () => {
    const rows = [...week.rows, ['WARM UP PROTOCOL | بروتوكول التسخين'], ['PHASE 1 • UPPER', '', '', '', '', 'PHASE 1 • LOWER'],
      ['#', 'EXERCISE', 'REPS', '', 'LEVEL'], ['1', 'Pallof Press', '10 reps per side', '', 'LIGHT']];
    const result = parseTrainingSheets([{ ...week, rows }]);
    expect(result.days[0]?.warmup).toEqual([{ name: 'Pallof Press', amount: 10, note: '10 reps per side · LIGHT' }]);
    expect(result.days[1]?.warmup).toEqual([]);
  });
});
