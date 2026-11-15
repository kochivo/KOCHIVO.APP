import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { FileRing } from './file-ring';
import type { FileActivity } from './load-activity';
import { v11Messages } from './v11-messages';
import { messages } from './messages';

export function FoodToday({ nutrition, locale, expanded = false }: { nutrition: FileActivity['nutrition']; locale: Locale; expanded?: boolean }) {
  const t = createT(v11Messages, locale), ft = createT(messages, locale);
  const n = (value: number) => formatNumber(Math.round(value), locale);
  return <section className={`glass flex gap-card-gap rounded-card border border-line-soft p-card ${expanded ? 'flex-col items-center' : 'items-center'}`}>
    {nutrition ? <>
      <FileRing value={nutrition.eaten.kcal} max={nutrition.targets.kcal} label={n(nutrition.eaten.kcal)} calm={!expanded} />
      <div className="w-full min-w-0 flex-1"><h2 className="mb-inline text-sm font-semibold">{t('foodToday')}</h2>
        {expanded && <p className="mb-stack text-xs text-muted">{t('calories', { target: n(nutrition.targets.kcal) })}</p>}
        {(['protein', 'carbs', 'fat'] as const).map((key, index) => <div key={key} className="my-inline flex items-center gap-inline text-xs text-muted">
          <i className={`size-2 rounded-full ${['bg-lime', 'bg-calm', 'bg-gold-2'][index]}`} />
          <span>{t(key)}</span><bdi className="ms-auto font-semibold text-ink">{n(nutrition.eaten[key])}/{n(nutrition.targets[key])}</bdi>
        </div>)}
      </div>
    </> : <p className="text-sm text-muted">{ft('noNutrition')}</p>}
  </section>;
}
