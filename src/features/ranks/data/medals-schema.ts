import { z } from 'zod';

const count = z.number().int().nonnegative();
export const medalCounts = z.object({ workouts: count, full_weeks: count, prs: count, crowns: count, crown_streak: count });
