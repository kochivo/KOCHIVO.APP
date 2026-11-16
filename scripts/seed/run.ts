import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { mapExercise } from './map-exercise.ts';
import { mapFood } from './map-food.ts';
import { mergeArabicNames } from './merge-names.ts';
import { z } from 'zod';
import { uploadFile } from './upload.ts';
import { estimatedPricesSchema, mapFoodPrices } from './map-food-prices.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const print = (message: string) => process.stdout.write(`${message}\n`);
const dietTagsSchema = z.array(z.enum(['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'])).min(1);
const foodLibrarySchema = z.object({
  diet_tags: dietTagsSchema,
  region: z.enum(['eg', 'gulf', 'lev', 'na', 'intl']), state: z.enum(['raw', 'cooked']).nullable(),
  fiber_per_100g: z.number().nonnegative().nullable(), sugar_per_100g: z.number().nonnegative().nullable(),
  sodium_mg_per_100g: z.number().nonnegative().nullable(), source_kind: z.enum(['usda', 'recipe', 'proxy']),
  source_ref: z.union([
    z.object({ fdc_id: z.string().min(1), dataset: z.string().min(1), description: z.string().min(1) }),
    z.object({ ingredients: z.array(z.object({ fdc_id: z.string().min(1), grams: z.number().positive(),
      description: z.string().min(1), diet_tags: dietTagsSchema })).min(1), cooked_yield_g: z.number().positive() }),
  ]),
  units: z.array(z.object({ key: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1),
    grams: z.number().positive() })).min(1),
});

function mapLibraryFood(entry: unknown, files: ReadonlySet<string>) {
  const { photo_file } = z.object({ photo_file: z.string() }).parse(entry);
  // T-315 photos are a later deliverable; still validate filenames and keep the original seed key.
  const mapped = mapFood(entry, new Set([...files, photo_file]));
  return { ...mapped, ...foodLibrarySchema.parse(entry),
    photo_path: files.has(photo_file) ? mapped.photo_path : null };
}

async function readEntries(filename: string): Promise<unknown[]> {
  const entries: unknown = JSON.parse(await readFile(join(root, 'supabase/seed/source', filename), 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`Expected an array: ${filename}`);
  return entries;
}

async function mediaFiles(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--dry-run')) throw new Error('Only --dry-run is supported.');
  const exerciseDir = join(root, 'assets-source/exercise-motion');
  const foodDir = join(root, 'assets-source/food-photos');
  const [exerciseEntries, foodEntries, nameEntries, gifs, photos] = await Promise.all([
    readEntries('exercises-gif.json'), readEntries('foods-starter.json'),
    readEntries('exercise-names-ar.proposed.json'),
    mediaFiles(exerciseDir), mediaFiles(foodDir),
  ]);
  const proposals = z.array(z.object({
    dataset_id: z.string(), name_ar: z.string().min(1), confidence: z.enum(['high', 'medium', 'low']),
  })).parse(nameEntries);
  const failures: string[] = [];
  function validate<T>(entries: unknown[], files: ReadonlySet<string>,
    mapper: (entry: unknown, files: ReadonlySet<string>) => T, label: string): T[] {
    const rows: T[] = [];
    entries.forEach((entry, index) => {
      try { rows.push(mapper(entry, files)); }
      catch (error) {
        failures.push(`${label}[${index}]: ${error instanceof Error ? error.message : 'Invalid entry'}`);
      }
    });
    return rows;
  }
  // Reviewed names (high, plus medium kept for the trial) fill only exercises without one.
  const exercises = mergeArabicNames(validate(exerciseEntries, gifs, mapExercise, 'exercises'),
    proposals, { minConfidence: 'medium' });
  const foods = validate(foodEntries, photos, mapLibraryFood, 'foods');
  const estimatedPrices = estimatedPricesSchema.parse(await readEntries('food-prices-egp.json'));
  const ids = exercises.map((row) => row.dataset_id);
  if (new Set(ids).size !== ids.length) failures.push('Duplicate exercise dataset_id.');
  const foodKeys = foods.map((row) => row.seed_key);
  if (new Set(foodKeys).size !== foodKeys.length) failures.push('Duplicate food seed_key.');
  if (failures.length) throw new Error(failures.join('\n'));
  const unnamed = exercises.filter((row) => !row.name_ar).length;
  print(`${exercises.length} exercises (${unnamed} without Arabic name) and ${foods.length} foods valid.`);
  if (args.includes('--dry-run')) {
    print('Dry run: wrote nothing.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const files = [
    ...exercises.map((row) => ({
      row, bucket: 'exercise-media', table: 'exercises', onConflict: 'dataset_id',
      filename: row.media_path.slice('exercise-media/'.length), directory: exerciseDir,
      contentType: 'image/gif',
    })),
    ...foods.map((row) => {
      const filename = row.photo_path?.slice('food-media/'.length) ?? `${row.seed_key}.webp`;
      return {
        row, bucket: 'food-media', table: 'foods', onConflict: 'seed_key',
        filename, directory: foodDir,
        contentType: extname(filename).toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg',
      };
    }),
  ];
  let completed = 0;
  for (let offset = 0; offset < files.length; offset += 6) {
    await Promise.all(files.slice(offset, offset + 6).map(async (file) => {
      const { filename, directory, bucket, contentType, table, row, onConflict } = file;
      try {
        if (table !== 'foods' || ('photo_path' in row && row.photo_path)) {
          await uploadFile(client, bucket, filename, join(directory, filename), contentType);
        }
        const { error } = 'photo_path' in row
          ? await client.from('foods').upsert(row, { onConflict, ignoreDuplicates: false })
          : await client.from('exercises').upsert(row, { onConflict, ignoreDuplicates: true });
        if (error) throw new Error('Upsert failed.');
      } catch {
        failures.push(filename);
      } finally {
        completed += 1;
        if (completed % 100 === 0) print(`Processed ${completed}/${files.length} files.`);
      }
    }));
  }
  print(`Processed ${completed}/${files.length} files.`);
  if (failures.length) throw new Error(`Failed files:\n${failures.join('\n')}`);
  const catalog = await client.from('foods').select('id,seed_key').is('owner_id', null).not('seed_key', 'is', null);
  if (catalog.error) throw new Error('Could not resolve food price seed keys.');
  const prices = mapFoodPrices(estimatedPrices, catalog.data ?? []);
  for (const row of prices.rows) {
    const existing = await client.from('food_prices').select('food_id').eq('food_id', row.food_id).is('owner_id', null).maybeSingle();
    if (existing.error) throw new Error('Could not read food price.');
    // Estimates never overwrite an owner-reviewed price on repeated seed runs.
    if (!existing.data) {
      const result = await client.from('food_prices').insert(row);
      if (result.error) throw new Error('Could not seed food price.');
    }
  }
  print(`${prices.rows.length} estimated prices loaded. Owner confirmation required before production.`);
  if (prices.missing.length) print(`Price estimates awaiting catalog foods: ${prices.missing.join(', ')}`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/seed/run.ts')) main().catch((error: unknown) => {
  // Never print client errors, which can contain credentials or request headers.
  const message = error instanceof Error ? error.message : 'Seed failed.';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.stderr.write(`${key ? message.replaceAll(key, '[redacted]') : message}\n`);
  process.exitCode = 1;
});
