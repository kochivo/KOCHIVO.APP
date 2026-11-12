import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { DEFAULT_TIMEZONE, localDate, formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { lastSeenLabel } from '@/features/roster';
import { primaryCard } from './model';
import { messages } from './messages';
import type { FileSummary, Profile } from './types';

export function StatusCards({ playerId, profile, summary, locale, today }: {
  playerId: string; profile: Profile; summary: FileSummary; locale: Locale; today: string;
}) {
  const t = createT(messages, locale);
  const n = (value: number | null | undefined) => value == null ? t('unavailable') : formatNumber(value, locale);
  const date = (value: string | null) => value ? formatDateAr(localDate(new Date(value), profile.timezone ?? DEFAULT_TIMEZONE), { day: 'numeric', month: 'long' }, locale) : t('unavailable');
  const primary = primaryCard({ training: Boolean(profile.program), nutrition: Boolean(profile.nutrition), assessments: Boolean(summary.assessment) });
  const base = `/captain/players/${playerId}`;
  const cards = [
    { key: 'training', href: `${base}/programs`, title: profile.program ? starterText(profile.program.title, locale) : t('noProgram'),
      line: t('trainingSummary', { days: n(profile.program?.days ?? profile.intake?.trainingDays.length), last: lastSeenLabel(summary.lastTraining, today, locale) }),
      action: t(profile.program ? 'openTraining' : 'createTraining') },
    { key: 'nutrition', href: `${base}/nutrition`, title: profile.nutrition ? starterText(profile.nutrition.title, locale) : t('noNutrition'),
      line: profile.nutrition ? t('nutritionTargets', { kcal: n(profile.nutrition.kcal), protein: n(profile.nutrition.protein) }) : t('prepareTargets'),
      action: t(profile.nutrition ? 'openNutrition' : 'createNutrition') },
    { key: 'assessments', href: `${base}/assessments`, title: summary.assessment?.title ?? t('noAssessments'),
      line: t('assessmentSummary', { next: date(summary.assessment?.next ?? null), last: date(summary.assessment?.last ?? null) }), action: t('scheduleAssessment') },
  ] as const;
  return <div className="grid gap-[18px] min-[1001px]:grid-cols-3">{cards.map(card => <section key={card.key}
    className={`glass-strong rounded-card border px-5 py-[18px] ${primary === card.key ? 'border-warn' : 'border-line-soft'}`}>
    <p className="text-xs text-faint">{t(card.key)}</p><h2 className="my-1.5 break-words font-display text-[19px] font-semibold">{card.title}</h2>
    <p className="text-[12.5px] text-muted">{card.line}</p>
    <Link href={card.href} prefetch={false} data-primary={primary === card.key ? 'true' : undefined}
      className={`mt-3 inline-flex min-h-12 items-center rounded-full px-4 text-sm ${primary === card.key ? 'bg-lime font-extrabold text-on-lime' : 'glass border border-line-soft'}`}>{card.action}</Link>
  </section>)}</div>;
}
