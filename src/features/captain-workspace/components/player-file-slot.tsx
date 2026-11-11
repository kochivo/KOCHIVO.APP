import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { PlayerFile } from '@/features/player-file';
import { messages } from '../messages';
import { PlayerFilePanel } from './player-file-panel';
import { PlayerFileSheet } from './player-file-sheet';
import { PlayerFileSummary } from './player-file-summary';

export function PlayerFileSlot({ player, file, error = false, locale }: {
  player: { name: string; timezone?: string; intake: { weightKg: number } | null };
  file: PlayerFile | null; error?: boolean; locale: Locale;
}) {
  const t = createT(messages, locale);
  const content = error || !file ? <p role="alert" className="text-sm text-danger">{t('fileError')}</p> :
    <PlayerFilePanel name={player.name} file={file} initialWeight={player.intake?.weightKg} locale={locale} timezone={player.timezone} />;
  return <aside data-workspace-slot="player-file" className="min-w-0 lg:sticky lg:top-4">
    <div className="hidden rounded-card border border-line p-6 lg:glass lg:block lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">{content}</div>
    <div className="space-y-3 lg:hidden">
      <h1 className="break-words font-display text-2xl font-bold">{player.name}</h1>
      <PlayerFileSheet locale={locale} summary={file && !error ? <PlayerFileSummary file={file} locale={locale} /> : t('fileError')}>
        {content}
      </PlayerFileSheet>
    </div>
  </aside>;
}
