import { z } from 'zod';

export type Level = 'beginner' | 'intermediate' | 'advanced';
const metadata = z.object({ level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  minutes: z.number().positive().optional(), equipment: z.enum(['gym', 'dumbbells', 'bodyweight']).optional() });

export function trainingMetadata(settings: unknown) {
  const parsed = metadata.safeParse(settings);
  if (!parsed.success) return {};
  const { level, minutes, equipment: place } = parsed.data;
  return { ...(level ? { level } : {}), ...(minutes ? { minutes } : {}), ...(place ? { place } : {}) };
}

function normalize(value: string) {
  return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function filterTemplates<T extends { title: string; level?: string }>(rows: T[], query: string, level: string) {
  return rows.filter(row => (level === 'all' || row.level === level) && normalize(row.title).includes(normalize(query)));
}

export function usageCount(copies: { player_id: string | null; status: string }[]) {
  return new Set(copies.filter(row => row.player_id && row.status !== 'archived').map(row => row.player_id)).size;
}
