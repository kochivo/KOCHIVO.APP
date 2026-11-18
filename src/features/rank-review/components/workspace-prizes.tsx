import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { useResource } from '@/core/resource';
import { loadCrownPrize } from '@/features/ranks';
import { formatDateAr } from '@/lib/dates';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { SkeletonCard } from '@/ui/skeleton';
import { messages } from '../messages';
import { nextMonth } from '../months';
import { CrownPrizeEditor } from './crown-prize-editor';
import type { LeaderboardScreen } from './leaderboard-screen';
import { WorkspacePrizeCard } from './workspace-prize-card';
import { workspaceMessages } from './workspace/messages';

export function WorkspacePrizes({ locale, board, current, currentPrize, openNext, closeNext }: {
  locale: Locale; board: ComponentProps<typeof LeaderboardScreen>['board'];
  current: string; currentPrize: string | null; openNext: () => void; closeNext: () => void;
}) {
  const style = useArabicStyle();
  const t = createT(messages, locale, style);
  const copy = createT(workspaceMessages, locale, style);
  const next = nextMonth(current);
  const editingNext = board.month === next;
  const loadNext = useCallback(() => loadCrownPrize(next), [next]);
  const nextPrize = useResource(board.savePrize ? `rank-review:prize:${next}` : null, loadNext);
  const savePrize = board.savePrize;
  const prizeLabel = (month: string) => copy('prizeMonth', { month: formatDateAr(month, { month: 'long' }, locale) });
  const currentCard = <WorkspacePrizeCard locale={locale} title={prizeLabel(current)} prize={currentPrize} current />;
  const cancelNext = <Button variant="secondary" onClick={closeNext}>{t('cancelPrize')}</Button>;

  return <>
    {savePrize && board.month === current ?
      <CrownPrizeEditor key={current} locale={locale} label={prizeLabel(current)} prize={currentPrize} onSave={savePrize}
        saving={board.prizeSaving} error={board.prizeError}
        renderSummary={openEditor => <WorkspacePrizeCard locale={locale} title={prizeLabel(current)} prize={currentPrize}
          current onEdit={openEditor} disabled={board.prizeSaving} />} /> :
      <section className="glass rounded-card p-card">{currentCard}</section>}
    {editingNext && savePrize ? (
      board.error ? <section className="space-y-stack">
        <ErrorState message={copy('prizeLoadError')} retryLabel={t('retry')} onRetry={board.reload} />
        {cancelNext}
      </section> : !board.rows ? <section className="space-y-stack">
        <SkeletonCard lines={1} />
        {cancelNext}
      </section> : <CrownPrizeEditor key={next} locale={locale} label={prizeLabel(next)} prize={board.prize ?? null} editing
        saving={board.prizeSaving} error={board.prizeError} onCancel={closeNext}
        onSave={async value => {
          await savePrize(value);
          closeNext();
          void nextPrize.retry();
        }} />
    ) : savePrize && nextPrize.status === 'error' ?
      <ErrorState message={copy('prizeLoadError')} retryLabel={t('retry')} onRetry={nextPrize.retry} /> :
      savePrize && nextPrize.data === undefined ? <SkeletonCard lines={1} /> :
      <section className="glass rounded-card p-card">
        <WorkspacePrizeCard locale={locale} title={prizeLabel(next)} prize={nextPrize.data ?? null}
          onEdit={savePrize ? openNext : undefined} disabled={board.prizeSaving} />
      </section>}
  </>;
}
