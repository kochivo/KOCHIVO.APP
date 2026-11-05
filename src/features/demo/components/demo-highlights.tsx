'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { Dumbbell, Radar, Smartphone, Users } from 'lucide-react';

const items = [
  { icon: Users, key: 'highlightRoster' },
  { icon: Radar, key: 'highlightRadar' },
  { icon: Dumbbell, key: 'highlightPrograms' },
  { icon: Smartphone, key: 'highlightPreview' },
] as const;

export function DemoHighlights() {
  const t = useT(messages);
  return <section aria-labelledby="demo-highlights" className="glass hidden space-y-5 rounded-card p-6 lg:block">
    <h2 id="demo-highlights" className="text-xl font-bold">{t('insideTheDemo')}</h2>
    <ul className="space-y-4">{items.map(({ icon: Icon, key }) => <li key={key} className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-raised text-ink"><Icon aria-hidden className="size-5" /></span>
      <span className="pt-2">{t(key)}</span>
    </li>)}</ul>
  </section>;
}
