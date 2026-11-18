'use client';
import { useState } from 'react';
import { History } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { KoGallery } from '@/ui/icons';
import { LoadingState } from '@/ui/loading-state';
import type { CheckIn } from '../data/checkins';
import { messages } from '../player-v4/messages';
import { messages as progressMessages } from '../messages';
import { PlayerGallery } from './player-gallery';

const CheckinHistory = dynamic(() => import('./checkin-history').then(module => module.CheckinHistory), { ssr: false, loading: () => <LoadingState variant="list" /> });

export function ProgressRecords({ checkins }: { checkins: CheckIn[] }) {
  const t = useT(messages), locale = useLocale();
  const progress = useT(progressMessages);
  const [open, setOpen] = useState<'photos' | 'history' | null>(null);
  const photos = checkins.reduce((total, row) => total + (row.photo_paths?.length ?? 0), 0);
  const options = [
    { key: 'photos', Icon: KoGallery, count: photos },
    { key: 'history', Icon: History, count: checkins.length },
  ] as const;
  return <section className="space-y-stack" data-progress-section="records">
    <div className="grid grid-cols-2 gap-inline">
      {options.map(({ key, Icon, count }) => <Button key={key} type="button" variant="secondary" aria-expanded={open === key}
        className="min-w-0 justify-start px-stack text-start" onClick={() => setOpen(value => value === key ? null : key)}>
        <Icon aria-hidden className="size-5 shrink-0 text-lime" /><span className="min-w-0 flex-1">{t(key)}</span>
        <bdi className="font-display text-muted">{formatNumber(count, locale)}</bdi>
      </Button>)}
    </div>
    {open === 'photos' && (photos ? <PlayerGallery checkins={checkins} /> : <p className="glass rounded-card p-card text-muted">{progress('comparisonPhotosArentAvailableYet')}</p>)}
    {open === 'history' && (checkins.length ? <CheckinHistory checkins={checkins} /> : <p className="glass rounded-card p-card text-muted">{progress('firstCheckin')}</p>)}
  </section>;
}
