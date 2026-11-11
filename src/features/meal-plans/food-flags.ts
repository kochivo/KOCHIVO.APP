import type { PlayerFacts } from '@/features/player-file';
import type { Food } from './types';

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
// Conservative bilingual keyword rules, not a medical diagnosis. Unknown facts match literal
// names/tags only. Token boundaries avoid egg/eggplant and nut/coconut false positives.
export const foodKeywords = {
  dairy: ['dairy', 'milk', 'lactose', 'cheese', 'yogurt', 'حليب', 'لبن', 'لاكتوز', 'البان', 'جبنه', 'جبن', 'زبادي'],
  eggs: ['egg', 'eggs', 'بيض'],
  nuts: ['nut', 'nuts', 'peanut', 'peanuts', 'almond', 'almonds', 'مكسرات', 'فول سوداني', 'لوز'],
  gluten: ['gluten', 'wheat', 'bread', 'pasta', 'جلوتين', 'قمح', 'عيش', 'خبز', 'مكرونه'],
  fish: ['fish', 'tuna', 'salmon', 'سمك', 'تونه', 'سلمون'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'جمبري', 'قشريات'],
  seafood: ['seafood', 'fish', 'tuna', 'salmon', 'shrimp', 'prawn', 'shellfish', 'سمك', 'تونه', 'سلمون', 'جمبري', 'قشريات'],
  soy: ['soy', 'soya', 'صويا'],
  sesame: ['sesame', 'tahini', 'سمسم', 'طحينه'],
  diabetes: ['diabetes', 'diabetic', 'سكر', 'سكري', 'sugar', 'honey', 'عسل'],
  hypertension: ['hypertension', 'high blood pressure', 'ضغط', 'salt', 'salted', 'ملح', 'مملح'],
  blood_pressure: ['blood pressure', 'ضغط', 'salt', 'salted', 'ملح', 'مملح'],
} as const;
function contains(text: string, word: string) {
  return (` ${normalize(text).replace(/[^\p{L}\p{N}]+/gu, ' ')} `).includes(` ${normalize(word)} `);
}
export function flagFood(food: Pick<Food, 'name' | 'nameEn' | 'tags'>, facts: PlayerFacts): string[] {
  const text = [food.name, food.nameEn ?? '', ...(food.tags ?? [])].join(' ');
  const concerns = [...(facts.allergies?.value ?? []), ...(facts.medical?.value ?? [])].filter(value => value !== 'none');
  return [...new Set(concerns.filter(concern => {
    const aliases = Object.entries(foodKeywords).find(([key]) => key === concern)?.[1]
      ?? Object.entries(foodKeywords).find(([key, words]) => contains(concern, key) || words.some(word => contains(concern, word)))?.[1];
    return aliases ? aliases.some(word => contains(text, word)) : contains(text, concern);
  }))];
}
