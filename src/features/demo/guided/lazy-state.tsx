import { useT } from '@/core/i18n/client';
import { guidedMessages } from './messages';
export function LazyState() {
  const t = useT(guidedMessages);
  return <div role="status" className="glass min-h-64 rounded-card p-card text-muted">{t('loading')}</div>;
}
