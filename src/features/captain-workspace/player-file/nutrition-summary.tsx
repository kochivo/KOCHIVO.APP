import type { ReactNode } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import type { FileActivity } from './load-activity';
import { FoodToday } from './food-today';
import { v11Messages } from './v11-messages';
import { messages } from './messages';
import { FileDisclosureEntry } from './file-disclosure-entry';

export function NutritionSummary({ activity, locale, children }: { activity: FileActivity; locale: Locale; children?: ReactNode }) {
  const t = createT(v11Messages, locale), ft = createT(messages, locale);
  const nutrition = activity.nutrition;
  return <div className="space-y-3">
    <div className="grid items-start gap-3 min-[760px]:grid-cols-[1.4fr_1fr]">
      <FileDisclosureEntry title={nutrition?.title ?? ft('noNutrition')} label={t('changePlan')} preview={<>
        {nutrition?.meals.length ? nutrition.meals.map(meal => <div key={meal.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-4">
          <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{meal.name}</h3>
            <p className="mt-1 text-xs text-muted">{meal.items.map(item => `${item.name} ${formatNumber(item.grams, locale)}`).join(' + ')}</p></div>
          <bdi className="text-xs text-muted">{formatNumber(Math.round(meal.macros.kcal), locale)}</bdi>
          <span className={`rounded-full px-2 py-1 text-xs ${meal.logged ? 'bg-lime-soft text-lime' : 'bg-surface text-muted'}`}>{t(meal.logged ? 'logged' : 'notYet')}</span>
        </div>) : <p className="text-sm text-muted">{ft('noNutrition')}</p>}
      </>}>{children}</FileDisclosureEntry>
      <FoodToday nutrition={nutrition} locale={locale} expanded />
    </div>
  </div>;
}
