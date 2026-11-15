import { Button } from '@/ui/button';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
export function QueueState({ kind, locale, retry }: { kind: 'loading' | 'empty' | 'error'; locale: Locale; retry?: () => void }) {
  const t = createT(messages, locale);
  return <div role={kind === 'error' ? 'alert' : 'status'} className="glass rounded-card p-section">
    <p>{t(kind)}</p>{kind === 'empty' && <p className="mt-inline text-muted">{t('emptyBody')}</p>}
    {kind === 'error' && retry && <Button variant="secondary" className="mt-stack min-h-12 rounded-control px-page-x text-ink" onClick={retry}>{t('retry')}</Button>}
  </div>;
}
