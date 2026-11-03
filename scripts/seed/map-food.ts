import { z } from 'zod';

const text = z.string().trim().min(1);
const nutrient = z.number().finite().nonnegative().max(9999.9);
const foodSchema = z.object({
  name: text,
  name_ar: text,
  kcal_per_100g: z.number().finite().nonnegative().max(99999.9),
  protein_per_100g: nutrient,
  carbs_per_100g: nutrient,
  fat_per_100g: nutrient,
  photo_file: z.string().regex(/^[\w.-]+\.(webp|jpe?g)$/i),
});

export function mapFood(entry: unknown, mediaFiles: ReadonlySet<string>) {
  const { name, photo_file, ...row } = foodSchema.parse(entry);
  if (!mediaFiles.has(photo_file)) throw new Error(`Missing food media: ${photo_file}`);
  return {
    ...row, owner_id: null, name_en: name, photo_path: `food-media/${photo_file}`,
    seed_key: photo_file.replace(/\.[^.]+$/, ''),
  };
}
