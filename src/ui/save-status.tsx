import { CloudCheck, CloudUpload, CloudAlert } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { Button } from './button';
import { messages } from './save-status/messages';

export function SaveStatus({ status, locale, onRetry }: {
  status: 'saved' | 'saving' | 'error'; locale: Locale; onRetry?: () => void;
}) {
  const t = createT(messages, locale);
  const Icon = status === 'saved' ? CloudCheck : status === 'saving' ? CloudUpload : CloudAlert;
  return <span role={status === 'error' ? 'alert' : 'status'} className={`inline-flex items-center gap-2 text-xs ${status === 'error' ? 'text-danger' : 'text-faint'}`}>
    <Icon aria-hidden className="size-4" />{t(status)}
    {status === 'error' && onRetry && <Button variant="secondary" className="min-h-12 rounded-full" onClick={onRetry}>{t('retry')}</Button>}
  </span>;
}
