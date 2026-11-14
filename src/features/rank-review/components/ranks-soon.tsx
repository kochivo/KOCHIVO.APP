import { Trophy } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';

export function RanksSoon({ locale }: { locale: Locale }) {
  const t = createT(messages, locale);
  return <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
    <section className="glass-strong flex max-w-md flex-col items-center gap-4 rounded-card p-8 text-center">
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-lime/15 text-lime">
        <Trophy className="size-8" />
      </span>
      <h1 className="text-xl font-bold">{t('soonTitle')}</h1>
      <p className="text-sm leading-7 text-muted">{t('soonBody')}</p>
    </section>
  </main>;
}
