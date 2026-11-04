import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Dumbbell, Eye, Salad } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { formatDateAr, localDate } from '@/lib/dates';
import { starterText } from '@/lib/starter-text';
import { CaptainSupplements } from '@/features/supplements';
import type { PlayerProfile } from '../types';

function PlanCard({ icon: Icon, heading, title, lines, href, action }: {
  icon: LucideIcon; heading: string; title: string | null; lines: string[]; href: string; action: string;
}) {
  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-lime-soft text-lime"><Icon className="size-5" /></span>
        <h2 className="text-lg font-bold">{heading}</h2>
      </div>
      {title && <p className="text-xl font-extrabold">{title}</p>}
      {lines.map((line) => <p key={line} className="text-sm text-muted">{line}</p>)}
      <Link href={href} className="glass mt-auto inline-flex min-h-12 items-center justify-center rounded-control px-4 font-bold hover:bg-ink/10">{action}</Link>
    </GlassCard>
  );
}

export async function PlanTab({ playerId, program, nutrition }: Pick<PlayerProfile, 'program' | 'nutrition'> & { playerId: string }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const n = (value: number | null) => value === null ? t('dash') : formatNumber(value, locale);
  const updated = (iso: string) => t('updated', { date: formatDateAr(localDate(new Date(iso)), { day: 'numeric', month: 'long' }, locale) });
  const base = `/captain/players/${playerId}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {program ? <PlanCard icon={Dumbbell} heading={t('program')} title={starterText(program.title, locale)} href={`${base}/programs`} action={t('edit')}
          lines={[t('programSummary', { days: n(program.days), exercises: n(program.exercises) }), updated(program.updatedAt)]} /> :
          <EmptyState icon={Dumbbell} title={t('noProgramTitle')} body={t('noProgramBody')} action={{ label: t('writeProgram'), href: `${base}/programs` }} />}
        {nutrition ? <PlanCard icon={Salad} heading={t('nutrition')} title={starterText(nutrition.title, locale)} href={`${base}/nutrition`} action={t('edit')}
          lines={[t('nutritionSummary', { meals: n(nutrition.meals), kcal: n(nutrition.kcal) }),
            t('macros', { protein: n(nutrition.protein), carbs: n(nutrition.carbs), fat: n(nutrition.fat) }), updated(nutrition.updatedAt)]} /> :
          <EmptyState icon={Salad} title={t('noNutritionTitle')} body={t('noNutritionBody')} action={{ label: t('writeNutrition'), href: `${base}/nutrition` }} />}
      </div>
      <CaptainSupplements playerId={playerId} />
      <Link href={`${base}/preview`} className="inline-flex min-h-12 items-center gap-2 rounded-control px-4 text-sm font-bold hover:bg-ink/5">
        <Eye aria-hidden className="size-5" />{t('preview')}
      </Link>
    </div>
  );
}
