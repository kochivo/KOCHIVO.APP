// Lives in ui so client rows can show it without pulling the billing barrel into their bundles.
export type TierInfo = { name: string; color: string; is_featured?: boolean };
const colors: Record<string, string> = {
  lime: 'bg-lime-soft text-lime', warn: 'bg-warn-soft text-warn', danger: 'bg-danger-soft text-danger', muted: 'bg-surface-raised text-muted',
};
export function TierBadge({ tier }: { tier?: TierInfo | null }) {
  if (!tier || tier.name.trim() === 'أساسي') return null;
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[tier.color] ?? colors.muted}`}>{tier.name}</span>;
}
