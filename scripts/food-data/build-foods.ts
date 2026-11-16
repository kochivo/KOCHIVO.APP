/** Offline rebuild: node --experimental-strip-types scripts/food-data/build-foods.ts <extracted CSV root>
 * Supply SR Legacy April 2018 and Foundation October 2024 directories beneath that root.
 * food-references.json is the reviewed selection/recipe manifest; foods-starter.json preserves seed filenames.
 * Nutrient outputs are rebuilt exclusively from the supplied USDA CSVs.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

type Values = Record<string, number | null>;
type Source = { fdc_id: string; description: string; dataset: string; url: string; values: Values; diet_tags?: string[] };
type Ingredient = { fdc_id: string; grams: number; description: string; diet_tags: string[] };
type Reference = {
  source_id: string; name: string; name_ar: string; basis_g: number; kind: string;
  preparation: { en: string; ar: string }; note: { en: string; ar: string };
  sources: Source[]; values: Values; region: string; original_values?: Values; recipe?: { final_yield_g: number;
    ingredients: { fdc_id: string | null; grams: number; name: string; name_ar: string }[] };
};
const fields = {
  kcal_per_100g: ['1008', '2047', '2048'], protein_per_100g: ['1003'], carbs_per_100g: ['1005'],
  fat_per_100g: ['1004'], fiber_per_100g: ['1079'], sugar_per_100g: ['2000', '1063'], sodium_mg_per_100g: ['1093'],
};
// Handles quoted commas, escaped quotes, CRLF and embedded newlines in the USDA exports.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Pass the root containing extracted USDA CSV directories.');
  const catalog = new Map<string, Source>();
  const portions = new Map<string, Record<string, string>[]>();
  async function load(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (!entries.some(e => e.name === 'food.csv')) {
      for (const entry of entries.filter(e => e.isDirectory())) await load(join(directory, entry.name));
      return;
    }
    const records = parseCsv(await readFile(join(directory, 'food.csv'), 'utf8'));
    for (const row of parseCsv(await readFile(join(directory, 'food_portion.csv'), 'utf8'))) {
      if (!row.fdc_id || !(Number(row.gram_weight) > 0)) continue;
      const list = portions.get(row.fdc_id) ?? [];
      list.push(row); portions.set(row.fdc_id, list);
    }
    const nutrients = new Map<string, Map<string, number>>();
    for (const row of parseCsv(await readFile(join(directory, 'food_nutrient.csv'), 'utf8'))) {
      if (!row.amount || !row.fdc_id || !row.nutrient_id) continue;
      const values = nutrients.get(row.fdc_id) ?? new Map<string, number>();
      values.set(row.nutrient_id, Number(row.amount)); nutrients.set(row.fdc_id, values);
    }
    for (const row of records) {
      if (!row.data_type || !row.fdc_id || !row.description) continue;
      if (!['foundation_food', 'sr_legacy_food'].includes(row.data_type)) continue;
      const values = nutrients.get(row.fdc_id);
      const dataset = row.data_type === 'foundation_food' ? 'Foundation, October 2024' : 'SR Legacy, April 2018';
      catalog.set(row.fdc_id, { fdc_id: row.fdc_id, dataset, description: row.description,
        url: `https://fdc.nal.usda.gov/food-details/${row.fdc_id}/nutrients`,
        values: Object.fromEntries(Object.entries(fields).map(([key, ids]) =>
          [key, ids.map(id => values?.get(id)).find(v => v !== undefined) ?? null])) });
    }
  }
  await load(resolve(input));
  const root = new URL('../../', import.meta.url);
  const dataUrl = new URL('supabase/seed/source/', root);
  const oldFoods = JSON.parse(await readFile(new URL('foods-starter.json', dataUrl), 'utf8')) as Record<string, unknown>[];
  const oldRefs = JSON.parse(await readFile(new URL('food-references.json', dataUrl), 'utf8')) as Reference[];
  const tagsById = new Map<string, string[]>();
  const allowedTags = ['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'];
  for (const ref of oldRefs) for (const item of ref.sources) {
    const tags = item.diet_tags;
    if (!tags || tags.length !== 1 || tags.some(tag => !allowedTags.includes(tag))) {
      throw new Error(`Missing or invalid ingredient tags: USDA ${item.fdc_id}`);
    }
    const previous = tagsById.get(item.fdc_id);
    if (previous && previous.join() !== tags.join()) throw new Error(`Conflicting tags: USDA ${item.fdc_id}`);
    tagsById.set(item.fdc_id, tags);
  }
  const source = (id: string) => {
    const value = catalog.get(id); const diet_tags = tagsById.get(id);
    if (!value || !diet_tags) throw new Error(`Missing USDA source or tags: ${id}`);
    return { ...value, diet_tags };
  };
  const foods: Record<string, unknown>[] = []; const refs: Record<string, unknown>[] = [];
  const changes: string[] = [];
  const round = (n: number) => Math.round(n * 10) / 10;
  function add(name: string, name_ar: string, region: string, kind: string, sources: Source[],
    ingredients?: Ingredient[], yieldG?: number, previous?: Record<string, unknown>, reference?: Reference) {
    const first = sources[0];
    if (!first) throw new Error(`Missing source for ${name}`);
    const values: Values = ingredients ? Object.fromEntries(Object.keys(fields).map(key => {
      const amounts = ingredients.map(i => ({ grams: i.grams, value: source(i.fdc_id).values[key] }));
      return [key, amounts.some(i => i.value === null) ? null : round(amounts.reduce((sum, i) => sum + Number(i.value) * i.grams, 0) / Number(yieldG))];
    })) : Object.fromEntries(Object.entries(first.values).map(([key, value]) => [key, value === null ? null : round(value)]));
    if (Object.keys(fields).slice(0, 4).some(k => values[k] === null)) throw new Error(`Missing macros: ${name}`);
    const state = ingredients ? 'cooked' : /raw|uncooked|dry,|dried|flour|semolina|spices|fresh/i.test(first.description) ? 'raw'
      : /cooked|roasted|boiled|canned|bread|baked|fried|falafel, home-prepared/i.test(first.description) ? 'cooked' : null;
    const source_ref = ingredients ? { ingredients, cooked_yield_g: yieldG } : {
      fdc_id: first.fdc_id, dataset: first.dataset, description: first.description,
    };
    const photo_file = String(previous?.photo_file ?? `food_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}-v1.webp`);
    let unit = ingredients && !/^Egg white|Ful medames|Falafel/i.test(name)
      ? { key: 'plate', name_ar: 'طبق', name_en: 'Plate', grams: 250 }
      : /\b(oil|ghee|butter|tahini|sauce|ketchup|mustard|mayonnaise|honey|sugar)\b/i.test(name)
        ? { key: 'tablespoon', name_ar: 'معلقة كبيرة', name_en: 'Tablespoon', grams: 15 }
        : /^(Salt|Cumin|Cinnamon|Black pepper)$/.test(name)
          ? { key: 'teaspoon', name_ar: 'معلقة صغيرة', name_en: 'Teaspoon', grams: 5 }
          : /bread|toast|pita/i.test(name)
            ? { key: 'loaf', name_ar: 'رغيف', name_en: 'Loaf', grams: 60 }
            : /egg|quail/i.test(name)
              ? { key: 'piece', name_ar: 'واحدة', name_en: 'Piece', grams: /white|yolk/i.test(name) ? 30 : /quail/i.test(name) ? 9 : 50 }
              : /chicken|beef|lamb|fish|mullet|mackerel|shrimp|squid|cod|haddock|trout|bass|crab|turkey|duck|rabbit|veal|falafel/i.test(name)
                ? { key: 'piece', name_ar: 'قطعة', name_en: 'Piece', grams: /falafel/i.test(name) ? 25 : 100 }
                : { key: 'cup', name_ar: 'كوب', name_en: 'Cup', grams: 150 };
    if (!ingredients) {
      const measures = [
        { key: 'cup', name_ar: 'كوب', name_en: 'Cup', match: /^cup/ },
        { key: 'tablespoon', name_ar: 'معلقة كبيرة', name_en: 'Tablespoon', match: /^(tablespoon|tbsp)/ },
        { key: 'teaspoon', name_ar: 'معلقة صغيرة', name_en: 'Teaspoon', match: /^(teaspoon|tsp)/ },
        { key: 'loaf', name_ar: 'رغيف', name_en: 'Loaf', match: /^(pita|loaf|roll)/ },
        { key: 'slice', name_ar: 'شريحة', name_en: 'Slice', match: /^slice/ },
        { key: 'piece', name_ar: 'واحدة', name_en: 'Piece', match: /^(large|piece|fillet|egg|fruit)/ },
      ];
      const available = portions.get(first.fdc_id) ?? [];
      const preferred = measures.find(m => m.key === unit.key);
      const portion = available.find(p => preferred?.match.test(p.modifier ?? ''))
        ?? available.find(p => measures.some(m => m.match.test(p.modifier ?? ''))) ?? available[0];
      if (!portion) throw new Error(`Missing USDA household portion: ${name}`);
      const measure = measures.find(m => m.match.test(portion.modifier ?? ''));
      unit = { key: measure?.key ?? 'serving', name_ar: measure?.name_ar ?? 'حصة USDA',
        name_en: measure?.name_en ?? String(portion.modifier), grams: Number(portion.gram_weight) / Number(portion.amount || 1) };
    }
    const diet_tags = [...new Set(ingredients ? ingredients.flatMap(i => i.diet_tags) : source(first.fdc_id).diet_tags)].sort();
    const food = { name, name_ar, ...values, photo_file, region, state, diet_tags, source_kind: kind, source_ref, units: [unit] };
    foods.push(food);
    if (previous && reference?.original_values) for (const key of Object.keys(fields).slice(0, 4)) {
      const before = reference?.original_values;
      const original = before?.[key] ?? previous[key];
      if (original !== values[key]) changes.push(`| ${name} | ${key} | ${original} | ${values[key]} |`);
    }
    const note = kind === 'proxy' ? { en: `Closest USDA proxy: ${first.description}; represents ${name}.`,
      ar: `بديل مرجعي من USDA لـ ${name_ar}؛ التركيبة المحلية ممكن تختلف.` }
      : ingredients ? { en: 'Home recipe estimate; ingredient states and cooked yield are explicit. Salt is included only when listed.',
        ar: 'تقدير وصفة بيتية؛ حالة المكونات والوزن بعد التسوية موضحين. الملح محسوب بس لو موجود في المكونات.' }
        : { en: 'USDA edible portion, per 100 g.', ar: 'الجزء اللي بيتاكل، لكل ١٠٠ جرام من USDA.' };
    refs.push({ source_id: reference?.source_id ?? `library-${photo_file.replace(/\.[^.]+$/, '')}`, name, name_ar,
      basis_g: 100, kind: kind === 'usda' ? 'reference' : kind, preparation: { en: state ?? 'As sold', ar: state === 'cooked' ? 'مطبوخ' : state === 'raw' ? 'ني' : 'زي ما بيتباع' },
      note, values, sources, region, state, diet_tags, source_kind: kind, source_ref, units: [unit],
      ...(reference?.original_values ? { original_values: reference.original_values } : {}),
      ...(ingredients ? { recipe: { final_yield_g: yieldG, ingredients: ingredients.map(i => ({ ...i, name: i.description, name_ar: i.description })) } } : {}) });
  }
  // Names, regions, seed filenames and recipe weights are curated inputs; only nutrients are regenerated.
  for (const previous of oldFoods) {
    const ref = oldRefs.find(r => r.name === previous.name);
    if (!ref) throw new Error(`Missing reference ${previous.name}`);
    const ingredients = ref.recipe?.ingredients.map(i => {
      if (!i.fdc_id) throw new Error(`Missing ingredient FDC id: ${ref.name}`);
      return { fdc_id: i.fdc_id, grams: i.grams, description: source(i.fdc_id).description, diet_tags: source(i.fdc_id).diet_tags };
    });
    const sources = ingredients ? ingredients.map(i => source(i.fdc_id)) : ref.sources.map(s => source(String(s.fdc_id)));
    const kind = ingredients ? 'recipe' : ref.kind === 'proxy' ? 'proxy' : 'usda';
    add(String(previous.name), String(previous.name_ar), ref.region,
      kind, sources, ingredients, ref.recipe?.final_yield_g, previous, ref);
  }
  await writeFile(new URL('foods-starter.json', dataUrl), JSON.stringify(foods, null, 2) + '\n');
  await writeFile(new URL('food-references.json', dataUrl), JSON.stringify(refs, null, 2) + '\n');
  const sections = ['# Food library: owner review', '',
    'Generated offline from USDA SR Legacy April 2018 (public domain/CC0). Foundation October 2024 was also inspected; no closer matches were needed.',
    'Recipes are explicit home-style estimates, not laboratory measurements. Weights refer to the USDA ingredient state; cooked grains/meats are weighed after cooking. Yield is edible finished weight. Missing nutrients remain null.',
    'Dried sweet whey and whey protein isolate (FDC 173177) are separate foods. No USDA casein supplement match was found; it is omitted rather than invented.',
    'Single-food household grams come from USDA food_portion.csv (weight divided by amount); recipe plate/piece sizes are explicit planning servings. Photos are planned filenames only.', ''];
  sections.push('The original cooked egg-white reference (2707289) was FNDDS, not an approved dataset. It is replaced by a cooking recipe: 100 g SR raw egg white (172183), 90 g finished yield.',
    'Recipe approximations for review: konafa uses shredded phyllo as a pastry substitute; belila/ashoura/harees use USDA cooked khorasan wheat for wheat berries. Orzo/vermicelli dishes use cooked USDA pasta. These recipes require owner approval.',
    'Diet tags follow owner decision 2026-11-16: poultry is separate from meat; seafood and shellfish are fish; whey and casein are dairy; honey is plant. Water and salt use the plant tag for these non-animal ingredients. Recipe tags are the sorted union of the reviewed ingredient tags.',
    'Falafel, fried is restored to USDA Falafel, home-prepared (FDC 172455), the same reference used in sandwiches; the boiled-fava recipe underestimated frying and is removed.', '');
  for (const region of ['eg', 'gulf', 'lev', 'na', 'intl']) {
    sections.push(`## ${region}`, '', '| Arabic | English | kcal | Protein | Carbs | Fat | Source | State | Tags |', '|---|---|---:|---:|---:|---:|---|---|---|');
    for (const food of foods.filter(f => f.region === region)) {
      const ref = food.source_ref as { ingredients?: Ingredient[]; cooked_yield_g?: number; fdc_id?: string };
      const provenance = ref.ingredients ? `${ref.ingredients.map(i => `${i.description} (FDC ${i.fdc_id}), ${i.grams} g`).join('; ')}; yield ${ref.cooked_yield_g} g`
        : `${food.source_kind}: FDC ${ref.fdc_id}`;
      sections.push(`| ${food.name_ar} | ${food.name} | ${food.kcal_per_100g} | ${food.protein_per_100g} | ${food.carbs_per_100g} | ${food.fat_per_100g} | ${provenance} | ${food.state ?? 'as sold'} | ${(food.diet_tags as string[]).join(', ')} |`);
    }
    sections.push('');
  }
  sections.push('## Fried dishes: check', '',
    'Reviewed all recipe ingredient states, oil amounts and finished yields. Oil below is modeled retained oil, not the frying bath; actual uptake and moisture loss are unverified. These estimates are unchanged pending owner review and must not be treated as measured deep-fried foods.', '',
    '| Dish | Frying assumption to check |', '|---|---|',
    '| Homemade taameya | Boiled fava beans replace soaked raw beans; 90 g oil per 1000 g yield. Same understatement risk as the removed falafel recipe. |',
    '| Fried cauliflower with egg | Boiled cauliflower plus 80 g oil per 1000 g yield; verify batter, retained oil and moisture loss. |',
    '| Mesakaa with beef | Boiled eggplant plus 35 g oil per 1000 g yield; cannot represent fried eggplant reliably. |',
    '| Chicken maqluba | Boiled eggplant and cauliflower plus 35 g oil per 1500 g yield; verify frying of vegetables. |',
    '| Koshari, typical; Besarah; Mujaddara; Lentil bulgur mujaddara | Boiled onions with shared recipe oil; fried onion toppings and their oil uptake are not modeled separately. |',
    '| Fattoush; Fatteh with chickpeas; Fatta with beef | Plain bread with shared recipe oil or ghee; confirm toasted versus fried bread and retained fat. |',
    '| Qatayef with nuts; Zalabya; Luqaimat | Flour-based dough, not boiled ingredients; retained frying oil and syrup/yield assumptions still need review. |',
    '| Tunisian brik | Phyllo, egg and tuna with 70 g oil; verify retained frying oil and finished yield. |',
    '');
  sections.push('## Original sixty: macro corrections against CSV / recipe calculation', '', '| Food | Field | Before | After |', '|---|---|---:|---:|', ...changes, '');
  await writeFile(new URL('docs/reports/food-library-review.md', root), sections.join('\n'));
  process.stdout.write(`Built ${foods.length} foods and ${refs.length} references.\n`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/build-foods.ts')) await main();
