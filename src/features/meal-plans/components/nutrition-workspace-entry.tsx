import { Suspense } from 'react';
import Link from 'next/link';
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
  if (calc) return <div className="grid gap-5">
    <Link href={href} className="flex min-h-12 items-center text-muted">{t('plan')}</Link>
    <Suspense fallback={<p role="status">{t('loading')}</p>}>
      <CalculatorContent playerId={playerId} locale={locale} />
    </Suspense></div>;
  const data = await loadPlayerEditor(playerId).catch(() => null);
  if (!data) {
    return <section role="alert" className="glass rounded-card p-5"><p>{t('loadFailed')}</p>
      <Link href={href} className="flex min-h-12 items-center">{t('retry')}</Link></section>;
  }
  return <PlayerEditorEntry data={data} />;
}
