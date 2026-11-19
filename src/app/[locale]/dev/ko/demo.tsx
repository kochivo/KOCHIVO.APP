'use client';

import { useState } from 'react';
import { ClipboardList, Dumbbell, Home, TrendingUp } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { KoPreview, koPreviewMessages } from '@/features/ko-preview';
import type { KoRole } from '@/features/ko-core';
import { FeedbackButton } from '@/features/feedback';
import { BrandMark, BottomNav, Segmented } from '@/ui';

export function KoDemo({ initialRole }: { initialRole: KoRole }) {
  const t = useT(koPreviewMessages);
  const [role, setRole] = useState<KoRole>(initialRole);
  const items = [
    { href: '#home', label: t('home'), icon: Home, active: true },
    { href: '#players', label: t(role === 'captain' ? 'players' : 'workout'), icon: Dumbbell },
    { href: '#programs', label: t(role === 'captain' ? 'programs' : 'food'), icon: ClipboardList },
    { href: '#tasks', label: t(role === 'captain' ? 'tasks' : 'progress'), icon: TrendingUp },
  ];
  return <div className="min-h-dvh bg-bg px-4 pb-[var(--page-bottom-clearance)] pt-[var(--captain-top-inset)] text-ink">
    <main className="mx-auto max-w-3xl space-y-6 pb-24">
      <header className="flex items-center gap-3"><BrandMark className="size-9" /><h1 className="text-2xl font-extrabold">{t('previewTitle')}</h1></header>
      <p className="text-sm text-muted">{t('previewDescription')}</p>
      <Segmented aria-label={t('previewDescription')} value={role} onChange={value => setRole(value === 'player' ? 'player' : 'captain')}
        options={[{ value: 'captain', label: t('captainRole') }, { value: 'player', label: t('playerRole') }]} />
      <section className="glass-strong space-y-3 rounded-card p-6"><h2 className="text-xl font-bold">{t('sampleTitle')}</h2><p className="text-sm leading-7 text-muted">{t('sampleBody')}</p></section>
      <div className="grid gap-4 sm:grid-cols-2">{[role === 'captain' ? 'captainFeature' : 'playerFeature', 'soon'].map(key => <section key={key} className="rounded-card border border-line bg-surface p-6"><p className="text-sm font-bold">{t(key as 'captainFeature' | 'playerFeature' | 'soon')}</p><p className="mt-3 text-xs leading-7 text-muted">{t(role)}</p></section>)}</div>
      <div data-preview-end aria-hidden="true" className="min-h-64 rounded-card border border-line" />
    </main>
    <FeedbackButton role={role} /><KoPreview key={role} role={role} interactive />
    <BottomNav aria-label={t('sampleTitle')} items={items} />
  </div>;
}
