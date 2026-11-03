'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button, EmptyState, ErrorState, GlassCard, LoadingState } from '@/ui';
import { localDate } from '@/lib/dates';
import { accessState, whatsappUrl } from '../access';
import { useCaptainContext } from '../hooks/use-my-captain';

const labels = { active: 'اشتراكك شغال', ending: 'اشتراكك هيخلص قريب', ended: 'اشتراكك خلص', archived: 'المتابعة متوقفة' };
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

export function CaptainScreen() {
  const { data, status, retry } = useCaptainContext();
  const state = data ? accessState({ ...data, today: localDate(new Date()) }) : 'active';
  const url = whatsappUrl(data?.phone ?? null);
  return <main className="mx-auto max-w-lg space-y-5 px-5 pt-6 pb-32">
    <header><h1 className="text-2xl font-extrabold"><bdi>CAPTAIN</bdi> · الكابتن</h1></header>
    {status === 'loading' ? <LoadingState /> : status === 'error' ?
      <ErrorState message="مش قادرين نحمّل بيانات الكابتن" retryLabel="جرّب تاني" onRetry={() => void retry()} /> :
      !data ? <EmptyState icon={MessageCircle} title="إنت مش متابع مع كابتن دلوقتي" body="بيانات الكابتن هتظهر هنا لما تبدأ المتابعة" /> :
        <GlassCard className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <span aria-hidden className="glass flex size-16 shrink-0 items-center justify-center rounded-card text-2xl font-bold">
              {data.fullName.trim().slice(0, 1)}
            </span>
            <h2 className="break-words text-xl font-bold">{data.fullName}</h2>
          </div>
          <span className={`inline-flex rounded-full px-3 py-2 text-sm ${state === 'active' ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>
            {labels[state]}
          </span>
          <div className="space-y-2 text-sm text-muted">
            {data.startedOn ? <p>مشترك من <time dateTime={data.startedOn}>{formatDate(data.startedOn)}</time></p> :
              <p>تاريخ بداية الاشتراك هيظهر لما النت يرجع</p>}
            <p>لحد <time dateTime={data.accessUntil}>{formatDate(data.accessUntil)}</time></p>
          </div>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label="كلّم الكابتن واتساب"
            className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-lime px-5 font-extrabold text-on-lime">
            <MessageCircle aria-hidden className="size-5" />كلّم الكابتن واتساب
          </a> : <Button disabled className="min-h-12 w-full">الكابتن لسه محطش رقمه</Button>}
        </GlassCard>}
    <Link href="/player/settings" className="glass flex min-h-12 items-center justify-center rounded-control px-4">الإعدادات</Link>
  </main>;
}
