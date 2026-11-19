import 'server-only';
// Pure helpers for server loaders in other features; the barrel would drag the player nutrition UI into their routes.
export { mapNutritionSnapshot, nutritionTrainingDayCount } from './nutrition-snapshot';
export { dayNutritionTargets, eatenMacros, eatenTotals, mealMacros, targetsOf } from '../macros';
export { filterMeals, hasSplitMenu } from '../day-type-filter';
