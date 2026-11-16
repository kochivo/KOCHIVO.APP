import fs from 'node:fs';
import { expect, it } from 'vitest';
import { parseCsv } from '../../../scripts/food-data/build-foods';

type Values = Record<string, number | null>;
type Source = { fdc_id: string; description: string; dataset: string; values: Values; diet_tags: string[] };
type Ref = {
  fdc_id?: string; dataset?: string; description?: string;
  ingredients?: { fdc_id: string; grams: number; description: string; diet_tags: string[] }[]; cooked_yield_g?: number;
};
type Food = {
  name: string; name_ar: string; region: string; state: string | null; source_kind: string;
  source_ref: Ref; units: { key: string; grams: number }[]; photo_file: string; diet_tags: string[];
} & Record<`${'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium_mg'}_per_100g`, number | null>;
const read = (file: string) => JSON.parse(fs.readFileSync(
  new URL(`../../../supabase/seed/source/${file}.json`, import.meta.url), 'utf8'));
const foods = read('foods-starter') as Food[];
const references = read('food-references') as { name: string; sources: Source[]; values: Values }[];
const fields = ['kcal_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g',
  'fiber_per_100g', 'sugar_per_100g', 'sodium_mg_per_100g'] as const;

it('provides about 300 distinct sourced foods with household units and valid metadata', () => {
  expect(foods.length).toBeGreaterThanOrEqual(280);
  expect(foods.length).toBeLessThanOrEqual(320);
  for (const key of ['name', 'name_ar', 'photo_file'] as const) {
    expect(new Set(foods.map(f => f[key])).size, key).toBe(foods.length);
  }
  expect(references).toHaveLength(foods.length);
  for (const food of foods) {
    expect(['eg', 'gulf', 'lev', 'na', 'intl'], food.name).toContain(food.region);
    expect(['raw', 'cooked', null], food.name).toContain(food.state);
    expect(['usda', 'recipe', 'proxy'], food.name).toContain(food.source_kind);
    expect(Object.keys(food.source_ref ?? {}), food.name).not.toHaveLength(0);
    expect(food.units?.length, food.name).toBeGreaterThan(0);
    for (const unit of food.units) expect(unit.grams, food.name).toBeGreaterThan(0);
    expect(food.photo_file).toMatch(/^food_[\w-]+-v1\.webp$/);
  }
});

it('uses portions appropriate for dishes, boiled eggs, bread and oil', () => {
  expect(foods.find(f => f.name === 'Whey protein isolate')?.source_ref).toMatchObject({ fdc_id: '173177' });
  for (const [name, key, grams] of [
    ['Whole egg, boiled', 'piece', 50], ['Baladi bread', 'loaf', 64],
    ['Olive oil', 'tablespoon', 13.5], ['Ful with olive oil', 'plate', 250],
    ['Pasta with tomato sauce', 'plate', 250], ['White rice, cooked', 'cup', 158],
  ] as const) expect(foods.find(f => f.name === name)?.units).toMatchObject([{ key, grams }]);
  for (const name of ['Ful medames, plain']) {
    expect(foods.find(f => f.name === name)).toMatchObject({ source_kind: 'recipe', state: 'cooked' });
  }
});

it('tags every food and computes recipe tags from independently classified USDA ingredients', () => {
  const allowed = ['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'];
  const sources = new Map(references.flatMap(r => r.sources.map(s => [s.fdc_id, s] as const)));
  for (const food of foods) {
    expect(food.diet_tags?.length, food.name).toBeGreaterThan(0);
    expect(new Set(food.diet_tags).size, food.name).toBe(food.diet_tags.length);
    for (const tag of food.diet_tags) expect(allowed, food.name).toContain(tag);
    if (food.source_kind !== 'recipe') {
      expect(food.diet_tags, food.name).toEqual(sources.get(String(food.source_ref.fdc_id))?.diet_tags);
      expect(food.diet_tags, food.name).toHaveLength(1);
      continue;
    }
    const tags = new Set<string>();
    for (const ingredient of food.source_ref.ingredients ?? []) {
      const source = sources.get(ingredient.fdc_id);
      expect(source?.diet_tags?.length, ingredient.description).toBeGreaterThan(0);
      expect(ingredient.diet_tags).toEqual(source?.diet_tags);
      for (const tag of source?.diet_tags ?? []) tags.add(tag);
    }
    expect([...food.diet_tags].sort(), food.name).toEqual([...tags].sort());
  }
  for (const [name, tags] of [
    ['Chicken breast, cooked', ['poultry']], ['White cheese, feta proxy', ['dairy']],
    ['Ful medames, plain', ['plant']], ['Whey protein isolate', ['dairy']], ['Honey', ['plant']],
    ['Shrimp, cooked', ['fish']], ['Squid, raw', ['fish']], ['Whole egg, boiled', ['egg']],
    ['Fatta with beef', ['dairy', 'meat', 'plant']],
  ] as const) expect(foods.find(f => f.name === name)?.diet_tags, name).toEqual(tags);
});

it('restores fried falafel to the USDA home-prepared reference used by sandwiches', () => {
  expect(foods.find(f => f.name === 'Falafel, fried')).toMatchObject({ source_kind: 'usda', state: 'cooked',
    source_ref: { fdc_id: '172455' }, kcal_per_100g: 333, protein_per_100g: 13.3,
    carbs_per_100g: 31.8, fat_per_100g: 17.8, diet_tags: ['plant'] });
  const reference = references.find(r => r.name === 'Falafel, fried');
  expect(reference?.sources).toHaveLength(1);
  expect(reference?.sources[0]?.fdc_id).toBe('172455');
});

it('recomputes every recipe from its independently recorded USDA ingredient values', () => {
  const sources = new Map(references.flatMap(r => r.sources.map(s => [String(s.fdc_id), s] as const)));
  const recipes = foods.filter(f => f.source_kind === 'recipe');
  expect(recipes.length).toBeGreaterThanOrEqual(110);
  for (const food of foods) {
    const reference = references.find(r => r.name === food.name);
    expect(reference, food.name).toBeDefined();
    expect(reference?.values, food.name).toEqual(Object.fromEntries(fields.map(k => [k, food[k]])));
    if (food.source_kind !== 'recipe') {
      expect(sources.has(String(food.source_ref?.fdc_id)), food.name).toBe(true);
      continue;
    }
    const ingredients = food.source_ref.ingredients ?? [];
    expect(ingredients.length, food.name).toBeGreaterThan(0);
    expect(food.source_ref.cooked_yield_g, food.name).toBeGreaterThan(0);
    for (const key of fields) {
      let total = 0;
      let missing = false;
      for (const ingredient of ingredients) {
        expect(ingredient.grams).toBeGreaterThan(0);
        const source = sources.get(String(ingredient.fdc_id));
        expect(source, ingredient.description).toBeDefined();
        const value = source?.values[key];
        if (value == null) missing = true;
        else total += value * ingredient.grams / 100;
      }
      if (missing) expect(food[key], `${food.name}: ${key}`).toBeNull();
      else expect(Math.abs(Number(food[key]) - total * 100 / Number(food.source_ref.cooked_yield_g)),
        `${food.name}: ${key}`).toBeLessThanOrEqual(0.1);
    }
  }
});

it('keeps energy consistent with Atwater factors or a documented food-specific exception', () => {
  // Fiber-rich vegetables/spices and USDA specific energy factors can differ from general 4/4/9.
  const exceptions: Record<string, string> = {
    Watermelon: 'USDA fruit-specific energy factors; rounding at 30 kcal amplifies the difference.',
    Cucumber: 'Fiber and USDA vegetable-specific energy factors at 15 kcal.',
    Tomato: 'Fiber and vegetable-specific energy factors at 18 kcal.',
    'Broccoli, cooked': 'Fiber-rich vegetable; total carbohydrate includes fiber.',
    'Spinach, cooked': 'Fiber-rich leafy vegetable; USDA specific energy factors.',
    'Zucchini, cooked': 'Vegetable-specific energy factors at 15 kcal.',
    'Green beans, cooked': 'Fiber-rich vegetable; total carbohydrate includes fiber.',
    'Molokhia, plain': 'Fiber-rich jute leaves diluted with water; USDA specific factors.',
    'Corn, cooked': 'USDA sweet-corn specific energy factors and fiber.',
    'Lemon juice': 'Organic acids and USDA specific carbohydrate energy factors.',
    'Okra, cooked': 'Fiber-rich vegetable; total carbohydrate includes fiber.',
    'Cabbage, cooked': 'Fiber and vegetable-specific energy factors.',
    'Grape leaves': 'Fiber-rich leaves; total carbohydrate includes fiber.',
    'Cauliflower, cooked': 'Fiber and vegetable-specific energy factors.',
    'Bell pepper, green': 'Fiber and vegetable-specific energy factors at 20 kcal.',
    'Bell pepper, red': 'Fiber and vegetable-specific energy factors.',
    Parsley: 'Fiber-rich leaves; total carbohydrate includes fiber.',
    Dill: 'Fiber-rich leaves; total carbohydrate includes fiber.',
    'Coriander leaves': 'Fiber-rich leaves; total carbohydrate includes fiber.',
    Lettuce: 'Fiber and vegetable-specific energy factors at 17 kcal.',
    'Mushrooms, cooked': 'Fiber and mushroom-specific energy factors.',
    'Pumpkin, cooked': 'Vegetable-specific energy factors at 20 kcal.',
    'Tomato paste': 'Concentrated fiber and vegetable-specific energy factors.',
    Vinegar: 'Acetic acid supplies energy outside protein/carbohydrate/fat.',
    Cumin: 'Fiber-rich spice; total carbohydrate includes fiber.',
    Cinnamon: 'Fiber-rich spice; total carbohydrate includes fiber.',
    'Black pepper': 'Fiber-rich spice; total carbohydrate includes fiber.',
  };
  for (const food of foods) {
    if (exceptions[food.name]) continue;
    const kcal = Number(food.kcal_per_100g);
    const calculated = 4 * Number(food.protein_per_100g) + 4 * Number(food.carbs_per_100g) + 9 * Number(food.fat_per_100g);
    expect(Math.abs(calculated - kcal) / Math.max(kcal, 1), food.name).toBeLessThanOrEqual(0.15);
  }
});

it('reads USDA quoted descriptions, embedded newlines and empty nutrient cells without losing columns', () => {
  expect(parseCsv('"fdc_id","description","amount"\r\n"1","Rice, cooked","0"\r\n"2","A ""quoted""\nfood",""\r\n'))
    .toEqual([{ fdc_id: '1', description: 'Rice, cooked', amount: '0' },
      { fdc_id: '2', description: 'A "quoted"\nfood', amount: '' }]);
});
