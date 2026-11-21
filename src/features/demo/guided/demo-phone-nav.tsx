import { EllipsisVertical } from 'lucide-react';
import { useT } from '@/core/i18n/client';
// eslint-disable-next-line no-restricted-imports -- The demo mirrors navigation with local callbacks only.
import { frameItems } from '@/features/roster/components/captain-frame-model';
// eslint-disable-next-line no-restricted-imports -- Shared navigation labels.
import { frameMessages } from '@/features/roster/components/captain-frame-messages';
// eslint-disable-next-line no-restricted-imports -- Type for the shared navigation model.
import type { FrameId } from '@/features/roster/components/captain-frame-model';
import { guidedMessages } from './messages';
import { KoPlus } from '@/ui/icons/ko-plus';

export function DemoPhoneNav({ active, count, more, onSelect, onMore, onAdd }: {
  active: FrameId; count: number; more: boolean; onSelect: (id: FrameId) => void; onMore: () => void; onAdd: () => void;
}) {
  const t = useT(frameMessages), demo = useT(guidedMessages);
  return <nav className="demo-phone-coach-nav" aria-label={t('work')}>
    {(['home', 'tasks', 'add', 'players', 'more'] as const).map(id => {
      const item = frameItems.find(item => item.id === id), Icon = item?.icon;
      const selected = id === 'more' ? more : id === active && !more;
      return <button key={id} type="button" aria-label={id === 'add' ? demo('add') : undefined} aria-current={selected ? 'page' : undefined}
        className={id === 'add' ? 'demo-quick-add' : `demo-phone-coach-tab ${selected ? 'text-ink font-bold' : 'text-muted'}`}
        onClick={() => id === 'add' ? onAdd() : id === 'more' ? onMore() : onSelect(id)}>
        {id === 'add' ? <KoPlus className="size-7" /> : <><span className="relative">{Icon ? <Icon aria-hidden className={`size-5 ${selected ? 'text-lime' : ''}`} /> : <EllipsisVertical aria-hidden className="size-5" />}
          {id === 'tasks' && count > 0 && <span className="absolute -end-3 -top-2 rounded-full bg-lime px-inline text-micro text-on-lime">{count}</span>}</span>{t(id)}</>}
      </button>;
    })}
  </nav>;
}
