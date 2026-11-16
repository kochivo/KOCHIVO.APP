import 'server-only';
// Pure helpers for server loaders in other features; the barrel would drag the player nutrition UI into their routes.
export { mapNutritionSnapshot } from './nutrition-snapshot';
export { mealMacros, targetsOf } from '../macros';
export { filterMeals } from '../day-type-filter';
