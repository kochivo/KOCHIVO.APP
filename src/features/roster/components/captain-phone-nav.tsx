import Link from 'next/link';
import { EllipsisVertical } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { KoPlus } from '@/ui/icons/ko-plus';
import { frameMessages } from './captain-frame-messages';
import { phoneMessages } from './captain-phone-messages';
import { frameItems } from './captain-frame-model';
import type { FrameId } from './captain-frame-model';

const tabs = frameItems.filter(item => item.id === 'home' || item.id === 'tasks' || item.id === 'players');
const control = 'press relative flex min-h-14 min-w-12 flex-col items-center justify-end gap-inline pb-inline text-center text-micro focus-visible:ring-2 focus-visible:ring-lime';
const selected = 'nav-slash font-bold text-ink before:start-auto before:top-0 before:bottom-auto before:h-1 before:w-4';

export function CaptainPhoneNav({ active, tasks, open, adding, onMore, onQuickAdd, onClose }: {
  active: FrameId; tasks: number | null; open: boolean; adding: boolean;
  onMore: () => void; onQuickAdd: () => void; onClose: () => void;
}) {
  const t = useT(frameMessages);
  const phone = useT(phoneMessages);
  const moreActive = open || !tabs.some(item => item.id === active);
  const tab = ({ id, href, icon: Icon }: typeof tabs[number]) => {
      const current = !open && active === id;
      return <Link key={id} href={href} prefetch={false} onClick={onClose} aria-current={current ? 'page' : undefined}
        className={`${control} row-start-1 ${id === 'players' ? 'col-start-4' : ''} ${current ? selected : 'text-muted'}`}>
        <span className="relative">
          <Icon active={current} aria-hidden className={`size-[22px] ${current ? 'text-lime!' : ''}`} />
          {id === 'tasks' && tasks !== null && tasks > 0 && <span className="absolute -end-3 -top-2 rounded-full bg-lime px-inline text-micro font-bold tabular-nums text-on-lime">{tasks}</span>}
        </span>
        {t(id)}
      </Link>;
  };
  return <nav data-captain-phone-nav aria-label={phone('navigation')}
    className="viewport-pinned fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end bg-bg px-inline pb-[calc(var(--spacing-card)+var(--safe-bottom))] md:hidden">
    {tabs.filter(item => item.id !== 'players').map(tab)}
    <button id="captain-quick-add" type="button" aria-label={phone('quickAdd')} aria-haspopup="dialog" aria-expanded={adding} onClick={onQuickAdd}
      className="press relative col-start-3 row-start-1 grid size-16 -translate-y-stack cursor-pointer place-items-center self-end justify-self-center rounded-card focus-visible:ring-2 focus-visible:ring-lime">
      <span aria-hidden className="pointer-events-none absolute inset-0 rotate-45 rounded-card bg-linear-to-b from-lime-top to-lime-bottom shadow-control-primary" />
      <KoPlus className="relative size-7 text-on-lime! [&_g]:hidden" aria-hidden />
    </button>
    {tabs.filter(item => item.id === 'players').map(tab)}
    <button id="captain-more" type="button" aria-haspopup="dialog" aria-expanded={open} aria-current={moreActive ? 'page' : undefined} onClick={onMore}
      className={`${control} col-start-5 row-start-1 cursor-pointer ${moreActive ? selected : 'text-muted'}`}>
      <EllipsisVertical className={`size-[22px] ${moreActive ? 'text-lime' : ''}`} aria-hidden />{t('more')}
    </button>
  </nav>;
}
