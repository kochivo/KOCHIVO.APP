import Image from 'next/image';
import Link from 'next/link';
import { Monitor, RotateCcw, Smartphone } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { guidedMessages } from './messages';
import type { Action, DemoState } from './state';

export function DemoHeader({ state, dispatch, now, onLanguage }: {
  state: DemoState; dispatch: (action: Action) => void; now: () => number; onLanguage: () => void;
}) {
  const t = useT(guidedMessages);
  return <header data-demo-header className="demo-header sticky top-0 z-30 border-b border-line bg-bg-deep">
    <div className="demo-top-bar mx-auto flex max-w-[1480px] items-center gap-inline">
      <Link prefetch={false} href="/" aria-label={t('homeLink')} className="press grid min-h-12 shrink-0 items-center rounded-control focus-visible:ring-2 focus-visible:ring-lime">
        <Image src="/brand/logo-primary.png" alt="" width={84} height={24} className="theme-dark-only" />
        <Image src="/brand/logo-primary-light.png" alt="" width={84} height={24} className="theme-light-only" />
      </Link>
      <span className="demo-fixture-pill items-center gap-inline rounded-full border border-line px-stack text-xs text-muted">
        <i aria-hidden className="size-2 rounded-full bg-lime ring-2 ring-lime-soft" />{t('label')}
      </span>
      <div className="demo-desktop-actions ms-auto items-center gap-inline">
        <Button variant="ghost" className="demo-language text-xs text-muted" onClick={onLanguage}>{t('languageSwitch')}</Button>
        <Button variant="secondary" onClick={() => dispatch({ type: 'restart', now: now() })}><RotateCcw className="size-4" aria-hidden />{t('restart')}</Button>
        <Link prefetch={false} href="/#pricing" className={buttonClass({ block: false })}>{t('free')}</Link>
      </div>
      <div className="demo-view-switch ms-auto items-center rounded-control border border-line bg-surface" role="group" aria-label={t('changeView')}>
        {(['captain', 'player'] as const).map(view => {
          const Icon = view === 'captain' ? Monitor : Smartphone;
          return <Button key={view} variant="ghost" className="demo-view-option text-xs" aria-pressed={state.view === view}
            onClick={() => dispatch({ type: 'patch', patch: { view } })}><Icon aria-hidden className="size-4" />{t(view)}</Button>;
        })}
      </div>
    </div>
  </header>;
}
