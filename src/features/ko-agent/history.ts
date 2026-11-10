import { z } from 'zod';

export const maxHistoryChars = 2000;
const turnSchema = z.strictObject({ role: z.enum(['user', 'ko']), text: z.string().min(1).max(500) });
export type KoTurn = z.infer<typeof turnSchema>;
export const historySchema = z.array(turnSchema).max(6)
  .refine(turns => turns.reduce((sum, turn) => sum + turn.text.length, 0) <= maxHistoryChars);

export function parseHistory(raw: unknown): KoTurn[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = historySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}

export function trimHistory(turns: readonly KoTurn[]): KoTurn[] {
  const recent = turns.filter(turn => turn.text.length > 0).slice(-6)
    .map(turn => ({ role: turn.role, text: turn.text.slice(0, 500) }));
  while (recent.reduce((sum, turn) => sum + turn.text.length, 0) > maxHistoryChars) recent.shift();
  return recent;
}

export function historyContents(turns: readonly KoTurn[]) {
  // Gemini expects alternating roles that start with the user and end before the current user turn.
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const turn of trimHistory(turns)) {
    const role = turn.role === 'ko' ? 'model' : 'user';
    // A voice turn has no transcript, so history can open with KO's question; keep it behind a placeholder.
    if (!contents.length && role === 'model') contents.push({ role: 'user', parts: [{ text: '…' }] });
    const last = contents.at(-1);
    if (last?.role === role) last.parts.push({ text: turn.text });
    else contents.push({ role, parts: [{ text: turn.text }] });
  }
  if (contents.at(-1)?.role === 'user') contents.push({ role: 'model', parts: [{ text: '…' }] });
  return contents;
}
