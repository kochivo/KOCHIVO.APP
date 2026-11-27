import { workbookSourceSchema } from '@/features/plan-source';
import { readWorkbook } from './read-workbook';
import { hasNutritionHeader, parseNutritionSheet } from './nutrition-sheet';
import { parseTrainingSheets } from './training-sheet';
import type { Review } from './import-review-model';

export async function prepareWorkbook(file: File, kind: Review['kind']): Promise<Review> {
  const sheets = await readWorkbook(file);
  const source = workbookSourceSchema.safeParse({
    fileName: file.name, sheets: sheets.map(sheet => ({ name: sheet.name, rows: sheet.displayRows ?? sheet.rows })),
  });
  if (!source.success) throw new Error('fileSize');
  if (kind === 'training') return { kind, plan: parseTrainingSheets(sheets), source: source.data };
  const matches = sheets.filter(sheet => hasNutritionHeader(sheet.rows));
  if (matches.length !== 1 || !matches[0]) throw new Error('unknownFormat');
  return { kind, plan: parseNutritionSheet(matches[0].rows), source: source.data };
}
