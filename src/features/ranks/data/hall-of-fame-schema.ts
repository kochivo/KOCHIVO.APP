import { z } from 'zod';

const winner = z.object({
  month: z.iso.date().refine(value => value.endsWith('-01')),
  player_id: z.uuid().nullable(), display_name: z.string(),
  adherence: z.number().int().min(1).max(100),
  done: z.number().int().min(4), planned: z.number().int().min(8),
});
export const hallOfFame = z.array(winner).max(12);
export type HallOfFameRow = z.infer<typeof winner>;
