import { sheetNumber } from './sheet-values';

export type PortionUnit = 'g' | 'ml' | 'piece';
export type SheetFood = { name: string; amount: number; unit: PortionUnit; kcal: number; protein: number; carbs: number; fat: number; note: string };
type Targets = Pick<SheetFood, 'kcal' | 'protein' | 'carbs' | 'fat'>;
export type NutritionSheet = { meals: { name: string; items: SheetFood[] }[]; targets: Targets | null; water: number | null; invalidWater: boolean };

export function hasNutritionHeader(rows: string[][]) {
  return rows.some(row => /الصنف|\bfood\b/i.test(row[1] ?? '') && /الكمية|amount/i.test(row[2] ?? '')
    && /الوحدة|unit/i.test(row[3] ?? '') && /القيم الغذائية|macros/i.test(row[4] ?? ''));
}

function foodUnit(label: string): PortionUnit {
  if (/^(g|gram[s]?|جم|غ|جرام|غرام)$/i.test(label)) return 'g';
  if (/^(ml|مل|مليلتر|مللي)$/i.test(label)) return 'ml';
  if (/^(pc[s]?|piece[s]?|حبة|حبه|قطعة|وحدة)$/i.test(label)) return 'piece';
  throw new Error('unknownUnit');
}

export function parseNutritionSheet(rows: string[][]): NutritionSheet {
  const header = rows.findIndex(row => hasNutritionHeader([row]));
  if (header < 0) throw new Error('unknownFormat');
  const meals: NutritionSheet['meals'] = [];
  let meal: NutritionSheet['meals'][number] | undefined;
  for (const [label = '', name = '', amount = '', unit = '', kcal, protein, carbs, fat, note = ''] of rows.slice(header + 1)) {
    if (/^(meal\s+distribution|coach notes)/i.test(name)) break;
    if (/^meal\s+\d+\b/i.test(label)) {
      if (meal) throw new Error('invalidMeal');
      meal = { name: (label.split('|').at(-1) ?? '').trim(), items: [] };
    } else if (/meal total|إجمالي الوجبة/i.test(label)) {
      if (!meal?.name || !meal.items.length) throw new Error('invalidMeal');
      meals.push(meal);
      meal = undefined;
    } else if (meal && (label || name)) {
      if (!name) throw new Error('invalidMeal');
      meal.items.push({ name, amount: sheetNumber(amount, 0.01, 5000), unit: foodUnit(unit),
        kcal: sheetNumber(kcal, 0, 10000), protein: sheetNumber(protein, 0, 5000),
        carbs: sheetNumber(carbs, 0, 5000), fat: sheetNumber(fat, 0, 5000), note });
    }
  }
  if (meal || !meals.length) throw new Error('invalidMeal');
  const targetIndex = rows.slice(0, header).findIndex(row => /total kcal/i.test(row[1] ?? ''));
  const targetRow = rows[targetIndex + 1] ?? [];
  const targets = targetIndex < 0 ? null : {
    kcal: sheetNumber(targetRow[1], 800, 8000, true), protein: sheetNumber(targetRow[2], 0, 1000, true),
    carbs: sheetNumber(targetRow[4], 0, 2000, true), fat: sheetNumber(targetRow[6], 0, 1000, true),
  };
  const waterValue = rows.slice(0, header).find(row => /الماء يوميًا|water.*lit/i.test(row[4] ?? ''))?.[6];
  const water = waterValue && Number(waterValue) >= 0.5 && Number(waterValue) <= 10 ? Math.round(Number(waterValue) * 1000) : null;
  return { meals, targets, water, invalidWater: Boolean(waterValue && water === null) };
}
