import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export interface WorkspacePlayer {
  name: string;
  intake: { birthYear: number; weightKg: number; targetWeightKg: number | null } | null;
}

export function PlayerFileSlot({ player, locale, today }: { player: WorkspacePlayer; locale: Locale; today: string }) {
  const t = createT(messages, locale);
  const n = (value: number) => formatNumber(value, locale);
  const intake = player.intake;
  const facts = [
    [t('age'), intake ? t('years', { count: n(Number(today.slice(0, 4)) - intake.birthYear) }) : t('unavailable')],
    [t('currentWeight'), intake ? t('kg', { count: n(intake.weightKg) }) : t('unavailable')],
    [t('targetWeight'), intake?.targetWeightKg != null ? t('kg', { count: n(intake.targetWeightKg) }) : t('unavailable')],
  ];
  return <aside data-workspace-slot="player-file" className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:rounded-card lg:border lg:border-line lg:p-6 lg:glass">
    <h1 className="break-words font-display text-2xl font-bold">{player.name}</h1>
    <dl className="glass-strong grid grid-cols-3 gap-2 rounded-control p-3 lg:gap-3">
      {facts.map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums lg:text-lg">{value}</dd>
      </div>)}
    </dl>
    <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-control border border-line px-4 text-sm text-muted lg:w-full">{t('playerFile')}</button>
  </aside>;
}
