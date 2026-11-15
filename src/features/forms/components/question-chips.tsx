import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import type { Question } from '../types';

export function QuestionChips({ question: q, locale }: { question: Question; locale: Locale }) {
  const m = messages[locale];
  return <div className="flex flex-wrap gap-inline text-xs">
    {q.maps_to && <span className="rounded-pill bg-lime/15 px-stack py-inline text-lime">{m.playerFile} {m.facts[q.maps_to]}</span>}
    {q.alert_on && <span className="rounded-pill bg-danger-soft px-stack py-inline text-danger">{m.alert}</span>}
    {(q.type === 'number' || q.type === 'scale') && <span className="glass rounded-pill px-stack py-inline">{m.chart}</span>}
  </div>;
}
