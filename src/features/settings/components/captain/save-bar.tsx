import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages } from '../../captain-sections/messages';

export function SaveBar({ dirty, pending, onReset }: { dirty: boolean; pending: boolean; onReset: () => void }) {
  const t = useT(messages);
  if (!dirty) return null;
  return <footer className="sticky bottom-(--nav-clearance) z-10 flex flex-wrap items-center justify-between gap-stack rounded-card border border-warn/40 bg-surface p-stack min-[760px]:bottom-0">
    <p className="flex items-center gap-inline text-sm font-semibold"><span aria-hidden className="size-2 rounded-full bg-warn" />{t('dirty')}</p>
    <div className="flex flex-wrap gap-inline">
      <Button type="button" variant="secondary" onClick={onReset} disabled={pending}>{t('reset')}</Button>
      <Button type="submit" disabled={pending}>{t(pending ? 'saving' : 'save')}</Button>
    </div>
  </footer>;
}
