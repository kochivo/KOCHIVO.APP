import { z } from 'zod';
import { latinDigits, privateContact } from './answer-guard';

export const uuidPattern = /[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi;
export const rememberSchema = z.strictObject({
  kind: z.enum(['alias', 'preference', 'correction', 'note']),
  text: z.string().max(200),
  player: z.string().trim().min(1).max(80).optional(),
});
export type Remember = z.input<typeof rememberSchema>;

export function validateMemory(input: Remember, existing: readonly string[], playerId?: string | null) {
  const normalized = latinDigits(input.text.normalize('NFKC').replace(/\p{Cf}/gu, ''));
  if (normalized.match(privateContact) || normalized.match(uuidPattern) || /\d{6}/.test(normalized)) return null;
  const text = [...input.text.trim()].slice(0, 200).join('');
  if (!text || existing.some(value => value.toLowerCase() === text.toLowerCase())) return null;
  if (input.player !== undefined && !playerId) return null;
  return { kind: input.kind, text, player_id: input.player === undefined ? null : playerId };
}
