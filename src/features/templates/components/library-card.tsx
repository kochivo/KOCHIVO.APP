'use client';

import { ChevronLeft, Salad, Users } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { starterText } from '@/lib/starter-text';
import { formatNumber } from '@/lib/format';
import { messages } from '../library-messages';
import { messages as templateMessages } from '../messages';
import { LibraryMenu } from './library-menu';
import type { ComponentProps } from 'react';
import { Button } from '@/ui/button';

export function LibraryCard({ onOpen, error, ...props }: ComponentProps<typeof LibraryMenu> & { onOpen: () => void; error?: string }) {
  const { template } = props;
  const t = useT(messages), tt = useT(templateMessages), locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const training = template.kind === 'program';
  const usage = template.uses === 1 ? t('usedOne') : template.uses ? t('used', { n: number(template.uses) }) : t(training ? 'unusedTraining' : 'unusedNutrition');
  const summary = training ? [t('days', { days: number(template.count) }),
    template.minutes ? t('minutes', { minutes: number(template.minutes) }) : '', template.place ? t(template.place) : ''].filter(Boolean).join(' · ')
    : [t('meals', { meals: number(template.count) }), template.protein != null ? t('protein', { protein: number(template.protein) }) : '', template.split ? t('split') : ''].filter(Boolean).join(' · ');
  // Lift the card whose menu is open above its siblings; each glass card is its own stacking layer.
  return <li className={training ? 'glass relative rounded-card border border-line-soft px-page-x py-page-y has-[details[open]]:z-20' : 'relative flex flex-wrap items-center gap-stack border-t border-line-soft px-page-x py-stack first:border-t-0 has-[details[open]]:z-20'}>
    {training ? <>
      {template.level && <span className="rounded-full border border-line-soft px-stack py-inline text-xs text-muted">{t(template.level)}</span>}
      <h2 className="mb-inline mt-stack break-words font-display text-title font-semibold">{starterText(template.title, locale)}</h2>
      {template.starter && <p className="text-xs text-lime">{tt('starterBadge')}</p>}
      <p className="text-xs text-faint">{summary}</p>
      <div className="mt-card-gap flex flex-wrap items-center gap-inline"><span className="me-auto inline-flex items-center gap-inline text-xs text-muted"><Users aria-hidden className="size-4" />{usage}</span>
        <Button disabled={props.busy} onClick={onOpen} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-card text-xs"}>{t('open')}</Button><LibraryMenu {...props} /></div>
    </> : <>
      <Salad aria-hidden className="size-6 shrink-0 text-lime" />
      <button disabled={props.busy} onClick={onOpen} className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-stack text-start">
        <span className="min-w-0 flex-1"><span className="block break-words">{starterText(template.title, locale)}</span><span className="block text-xs text-faint">{summary}</span>
          {template.starter && <span className="block text-xs text-lime">{tt('starterBadge')}</span>}</span>
        <span className="text-xs text-muted">{usage}</span><ChevronLeft aria-hidden className="size-4 shrink-0 text-faint ltr:rotate-180" />
      </button><LibraryMenu {...props} />
    </>}
    {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
  </li>;
}
