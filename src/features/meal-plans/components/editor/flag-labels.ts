import type { Translator } from '@/core/i18n/messages';
import type { messages } from './messages';

const keys = {
  lactose: 'dairy', dairy: 'dairy', milk: 'dairy', eggs: 'eggs', egg: 'eggs', nuts: 'nuts', gluten: 'gluten',
  seafood: 'seafood', fish: 'fish', shellfish: 'shellfish', soy: 'soy', sesame: 'sesame',
  diabetes: 'diabetes', blood_pressure: 'bloodPressure', hypertension: 'bloodPressure',
} as const;
export function flagLabels(reasons: string[], t: Translator<typeof messages>) {
  return reasons.map(reason => {
    const entry = Object.entries(keys).find(([key]) => key === reason);
    return entry ? t(entry[1]) : reason;
  }).join(', ');
}
