export type FeedReply = { text: string; token?: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// Reads a KO reply for a feed card: T-403 action cards first, then the older single confirm shape.
export function feedReply(result: unknown): FeedReply | null {
  if (!isRecord(result) || typeof result.text !== 'string') return null;
  const action = Array.isArray(result.actions) ? result.actions[0] : undefined;
  if (isRecord(action) && typeof action.token === 'string' && typeof action.title === 'string') {
    const detail = typeof action.detail === 'string' ? action.detail : '';
    return { text: [action.title, detail].filter(Boolean).join('\n'), token: action.token };
  }
  return { text: result.text, token: result.kind === 'confirm' && typeof result.token === 'string' ? result.token : undefined };
}
