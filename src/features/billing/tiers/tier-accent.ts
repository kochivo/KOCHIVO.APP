export type TierAccent = { bar: string; text: string };

const fallback: TierAccent = { bar: 'bg-muted', text: 'text-ink' };
const accents: Record<string, TierAccent> = {
  muted: fallback,
  lime: { bar: 'bg-lime', text: 'text-lime' },
  warn: { bar: 'bg-warn', text: 'text-warn' },
  danger: { bar: 'bg-danger', text: 'text-danger' },
};

export function tierAccent(color: string | null | undefined): TierAccent {
  return accents[color ?? ''] ?? fallback;
}
