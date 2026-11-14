'use client';
import { useT } from '@/core/i18n/client';
import { taskMessages } from './messages';
export function TasksState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry?: () => void }) {
  const t = useT(taskMessages);
  return <section role={kind === 'error' ? 'alert' : 'status'} className="glass rounded-card p-6 text-center">
    {kind === 'empty' ? <div className="py-9">
      <svg aria-hidden viewBox="0 0 80 80" className="mx-auto size-20 text-lime"><circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" /><text x="40" y="46" textAnchor="middle" fill="currentColor" className="text-lg">{0}</text></svg>
      <p className="mt-3 text-base">{t('empty')}</p><p className="mt-2 text-sm text-muted">{t('emptyBody')}</p>
    </div> : <p>{t(kind)}</p>}
    {kind === 'error' && retry && <button className="glass mt-3 min-h-12 rounded-control px-4" onClick={retry}>{t('retry')}</button>}
  </section>;
}
