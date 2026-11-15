import 'server-only';
import { Suspense } from 'react';
import { RowLink } from '@/ui/row-link';
import { createT } from '@/core/i18n';
import type { Locale } from '@/core/i18n';
import { loadPlayerEditor } from '../data/player-editor';
import { PlayerEditorEntry } from './editor/player-entry';
import { CalculatorContent } from './calculator-content';
import { messages } from './calculator/messages';

export async function NutritionWorkspaceEntry({ playerId, locale, view }: { playerId: string; locale: Locale; view: string }) {
  const t = createT(messages, locale);
  const calc = view === 'calc';
  const href = `/captain/players/${playerId}/nutrition`;
  if (calc) return <div className="grid gap-card-gap">
    <RowLink href={href} className="glass">{t('plan')}</RowLink>
    <Suspense fallback={<p role="status">{t('loading')}</p>}>
      <CalculatorContent playerId={playerId} locale={locale} />
    </Suspense></div>;
  const data = await loadPlayerEditor(playerId).catch(() => null);
  if (!data) {
    return <section role="alert" className="glass rounded-card p-card"><p>{t('loadFailed')}</p>
      <RowLink href={href} className="glass mt-stack">{t('retry')}</RowLink></section>;
  }
  return <PlayerEditorEntry data={data} />;
}
