import { Fragment } from 'react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import Link from 'next/link';
import { Moon } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import { KoTraining } from '@/ui/icons/ko-training';
import { playerNav } from '../nav';
import { cn } from '@/lib/cn';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PillNav } from '@/ui/pill-nav';
import css from './player-tabs.module.css';

export function PlayerTabsView({ pathname, locale, style, label, onSelect, workout = { href: '/player', labelKey: 'v4NoProgram', rest: false } }: {
  pathname: string; locale: Locale; style?: ArabicStyle; label: string; onSelect?: (href: string) => void;
  workout?: { href: string; labelKey: 'v4StartWorkout' | 'v4RestDay' | 'v4NoProgram'; rest: boolean };
}) {
  const t = createT(messages, locale, style);
  // The guided demo controls its own four destinations and has no assessments pane.
  const items = playerNav(pathname, locale, style, onSelect ? 'embedded' : 'v4');
  if (onSelect || !captainWorkspaceEnabled()) return <PillNav aria-label={label}
    items={items.map(item => onSelect ? { ...item, href: `#${item.href}` } : item)}
    onClickCapture={onSelect ? event => {
      const link = (event.target as Element).closest('a');
      if (link) { event.preventDefault(); onSelect((link.getAttribute('href') ?? '').replace(/^#/, '')); }
    } : undefined} />;
  return <nav aria-label={label} className={cn(css.bar, 'fixed inset-x-0 bottom-0 z-10')}>
    <div className={cn(css.slots, 'mx-auto grid max-w-lg grid-cols-5 items-end px-inline')}>
      {items.map(({ href: path, label, icon: Icon, active }, index) => <Fragment key={path}>
        {index === 2 && <Link href={workout.href} aria-label={t(workout.labelKey)}
          className={cn(css.workout, workout.rest && css.rest, 'grid place-items-center justify-self-center text-on-lime transition-transform motion-reduce:transition-none')}>
          <span className="grid -rotate-45 place-items-center">
            {workout.rest ? <Moon aria-hidden className="size-7" /> : <KoTraining aria-hidden className="size-7 text-on-lime! [&_*]:text-on-lime!" />}
          </span>
        </Link>}
        <Link href={path} data-tour={path} aria-current={active ? 'page' : undefined}
          className={cn(css.tab, 'press flex min-h-14 min-w-0 flex-col items-center justify-end gap-inline text-center text-micro', active ? 'font-bold text-ink' : 'text-faint')}>
          <Icon aria-hidden active={active} className={cn('size-[22px] [&_*]:text-inherit', active ? 'text-lime!' : 'text-faint!')} />
          <span>{label}</span>
        </Link>
      </Fragment>)}
    </div>
  </nav>;
}
