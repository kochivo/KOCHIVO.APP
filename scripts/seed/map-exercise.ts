import { z } from 'zod';

const text = z.string().trim().min(1);
const exerciseSchema = z.object({
  dataset_id: text,
  name_en: text,
  name_ar: text.nullish(),
  body_part: text,
  target: text.nullable(),
  equipment: text.nullable(),
  secondary_muscles: z.array(text),
  instructions_en: z.array(text),
  instructions_ar: z.array(text).nullish(),
  gif_file: z.string().regex(/^[\w.-]+\.gif$/i),
});

export function mapExercise(entry: unknown, mediaFiles: ReadonlySet<string>) {
  const { gif_file, ...row } = exerciseSchema.parse(entry);
  if (!mediaFiles.has(gif_file)) throw new Error(`Missing exercise media: ${gif_file}`);
  return {
    ...row,
    owner_id: null,
    name_ar: row.name_ar ?? null,
    instructions_ar: row.instructions_ar ?? null,
    media_path: `exercise-media/${gif_file}`,
  };
}
