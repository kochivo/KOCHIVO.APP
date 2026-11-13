import { z } from 'zod';
import { validSpecialties } from '@/lib/public-specialties';

export const publicPageSchema = z.object({
  specialties: z.array(z.string().trim()).refine(validSpecialties),
  years_experience: z.number().int().min(0).max(60).nullable(),
  languages: z.array(z.enum(['ar', 'en'])).max(2).transform(items => [...new Set(items)]),
  show_public_stats: z.boolean(),
});
export type PublicPageInput = z.infer<typeof publicPageSchema>;
