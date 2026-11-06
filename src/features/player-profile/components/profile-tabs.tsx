import Link from 'next/link';
import type { Translator } from '@/core/i18n/messages';
import { cn } from '@/lib/cn';
import type { messages } from '../messages';
import { profileTabs } from '../model';
import type { ProfileTab } from '../model';

export function ProfileTabs({ tab, t }: { tab: ProfileTab; t: Translator<typeof messages> }) {
  return <nav aria-label={t('tabs')} className="space-y-2">
    <div data-profile-segments="true" className="grid grid-cols-4 gap-1 rounded-control border border-line bg-surface-raised p-1">
      {profileTabs.slice(0, 4).map(key => <Link key={key} href={`?tab=${key}`} scroll={false} aria-current={key === tab ? 'page' : undefined}
        className={cn('flex min-h-12 min-w-0 items-center justify-center rounded-control px-1 text-xs font-bold transition-colors motion-reduce:transition-none sm:text-sm',
          key === tab ? 'bg-lime text-on-lime' : 'text-muted hover:bg-ink/5 hover:text-ink')}>{t(`tab.${key}`)}</Link>)}
    </div>
    <div className="flex flex-wrap gap-2">
      {profileTabs.slice(4).map(key => <Link key={key} href={`?tab=${key}`} scroll={false} aria-current={key === tab ? 'page' : undefined}
        className={cn('inline-flex min-h-12 items-center rounded-control px-3 text-xs font-bold',
          key === tab ? 'bg-lime-soft text-lime-ink' : 'text-muted hover:text-ink')}>{t(`tab.${key}`)}</Link>)}
    </div>
  </nav>;
}
