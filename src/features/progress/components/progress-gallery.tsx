'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui';
import { messages } from '../messages';
import { compareWeeks, poses } from '../gallery';
import type { GalleryPose, GalleryWeek } from '../gallery';

export function ProgressGallery({ weeks, onPhotoError }: { weeks: readonly GalleryWeek[]; onPhotoError?: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const ordered = [...weeks].filter(week => week.photos.length).sort((a, b) => b.date.localeCompare(a.date));
  const [comparing, setComparing] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [pose, setPose] = useState<GalleryPose>('front');
  const [imageError, setImageError] = useState(false);
  const comparison = compareWeeks(ordered, first, second, pose);
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
  function photos(week: GalleryWeek, onlyPose?: GalleryPose) {
    return <div className={onlyPose ? 'space-y-inline' : 'grid grid-cols-3 gap-inline'}>{[...poses, 'photo' as const].filter(key => !onlyPose || key === onlyPose).map(key => {
      const group = week.photos.filter(photo => photo.pose === key);
      return group.length ? <div key={key} className="space-y-inline"><p className="text-sm text-muted">{t(key)}</p>{group.map(photo =>
        // Signed private URLs bypass the image optimizer and its shared cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={photo.url} src={photo.url} alt={t('photoPosition', { value0: t(key) })} loading="lazy" decoding="async" width={480} height={640} referrerPolicy="no-referrer" className="aspect-[3/4] w-full rounded-control object-cover" onError={() => { setImageError(true); onPhotoError?.(); }} />)}</div> : null;
    })}</div>;
  }
  return <section className="glass space-y-card-gap rounded-card p-card">
    <h2 className="font-bold">{t('gallery')}</h2>
    {!ordered.length ? <p className="text-muted">{t('comparisonPhotosArentAvailableYet')}</p> : <>
      <Button variant="secondary" aria-pressed={comparing} onClick={() => setComparing(value => !value)}>{t('compare')}</Button>
      {imageError && <p role="alert" className="text-danger">{t('couldntLoadPhotos')}</p>}
      {comparing && <div className="space-y-stack">
        <div className="grid gap-stack sm:grid-cols-3">
          {([{ label: 'firstWeek', value: first, change: setFirst }, { label: 'secondWeek', value: second, change: setSecond }] as const).map(field =>
            <label key={field.label} className="grid gap-inline text-sm">{t(field.label)}<select className="min-h-12 rounded-control border border-line bg-bg px-stack" value={field.value} onChange={event => field.change(event.target.value)}>
              <option value="">{t('none')}</option>{ordered.map(week => <option key={week.date} value={week.date}>{date(week.date)}</option>)}
            </select></label>)}
          <label className="grid gap-inline text-sm">{t('pose')}<select className="min-h-12 rounded-control border border-line bg-bg px-stack" value={pose} onChange={event => setPose(event.target.value as GalleryPose)}>
            {[...poses, 'photo' as const].map(key => <option key={key} value={key}>{t(key)}</option>)}
          </select></label>
        </div>
        {comparison ? <div className="glass-strong space-y-stack rounded-control p-stack">
          <p>{comparison.delta === null ? t('noWeightDifference') : t('weightDifference', { value: formatNumber(comparison.delta, locale) })}</p>
          <div className="grid grid-cols-2 gap-stack">{[comparison.before, comparison.after].map((week, index) => <div key={week.date} className="space-y-inline">
            <h3>{t(index === 0 ? 'before' : 'after')}</h3><p className="text-sm text-muted">{date(week.date)}</p>{photos(week, pose)}
          </div>)}</div>
        </div> : <p role="status" className="text-muted">{t('chooseComparison')}</p>}
      </div>}
      <ul className="space-y-card-gap">{ordered.map(week => <li key={week.date} className="space-y-inline"><h3>{date(week.date)}</h3>{photos(week)}</li>)}</ul>
    </>}
  </section>;
}
