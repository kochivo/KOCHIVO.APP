import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { FileRing } from './file-ring';
import { v11Messages } from './v11-messages';

export function TrainingAdherence({ completed, planned, rpe, locale }: { completed: number; planned: number; rpe: number | null; locale: Locale }) {
  const t = createT(v11Messages, locale), n = (value: number) => formatNumber(value, locale);
  return <section className="glass flex items-center gap-card-gap rounded-card border border-line-soft p-card">
    {planned > 0 && <FileRing value={completed} max={planned} label={`${n(Math.round(completed / planned * 100))}%`} />}
    <div><h2 className="text-sm font-semibold">{t('adherence')}</h2>
      {planned > 0 && <p className="mt-inline text-xs leading-7 text-muted">{t('adherenceText', { done: n(completed), planned: n(planned) })}</p>}
      {rpe !== null && <p className="text-xs text-muted">{t('lastRpe', { value: n(rpe) })}</p>}
    </div>
  </section>;
}
