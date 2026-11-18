import { useT } from '@/core/i18n/client';
import { messages } from './v2/messages';

const widths = ['w-1/3', 'w-2/5', 'w-1/2', 'w-2/5', 'w-1/2', 'w-1/3'];

export function LibraryLoading() {
  const t = useT(messages);
  return <div className="glass overflow-hidden rounded-card">
    <p role="status" className="sr-only">{t('loading')}</p>
    <ul aria-hidden="true" aria-busy="true" className="divide-y divide-line-soft">
      {widths.map((width, index) => <li key={index} className="flex min-h-15 items-center gap-stack px-card">
        <span className="size-10 shrink-0 rounded-control bg-line" />
        <span className="flex flex-1 flex-col gap-inline">
          <span className={`h-2.5 rounded-full bg-line ${width}`} />
          <span className="h-2 w-1/5 rounded-full bg-line-soft" />
        </span>
        {['kcal', 'protein', 'carbs', 'fat'].map(metric => <span key={metric} className="hidden h-2.5 w-14 rounded-full bg-line-soft min-[760px]:block" />)}
      </li>)}
    </ul>
  </div>;
}
