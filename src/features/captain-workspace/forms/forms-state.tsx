import { Button } from '@/ui/button';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

export function FormsState({ kind, locale, retry }: {
  kind: 'loading' | 'error' | 'empty'; locale: Locale; retry?: () => void;
}) {
  const t = createT(messages, locale);
  return <div role={kind === 'error' ? 'alert' : 'status'} className="rounded-card border border-line p-section text-muted">
    <p>{t(kind)}</p>
    {kind === 'error' && retry && <Button variant="secondary" type="button" className="min-h-12 px-page-x text-ink" onClick={retry}>{t('retry')}</Button>}
  </div>;
}
