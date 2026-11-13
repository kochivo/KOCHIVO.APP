import { Button } from '@/ui/button';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
export function QueueState({ kind, locale, retry }: { kind: 'loading' | 'empty' | 'error'; locale: Locale; retry?: () => void }) {
  const t = createT(messages, locale);
  return <div role={kind === 'error' ? 'alert' : 'status'} className="glass rounded-card p-6">
    <p>{t(kind)}</p>{kind === 'empty' && <p className="mt-2 text-muted">{t('emptyBody')}</p>}
    {kind === 'error' && retry && <Button variant="secondary" className="mt-3 min-h-12 rounded-control px-5 text-ink" onClick={retry}>{t('retry')}</Button>}
  </div>;
}
