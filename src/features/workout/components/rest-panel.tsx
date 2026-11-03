import { Button } from '@/ui';
import { cn } from '@/lib/cn';
import { formatRest } from '../rest';

export function RestPanel({ remaining, flashing, onExtend, onSkip }: {
  remaining: number; flashing: boolean; onExtend: () => void; onSkip: () => void;
}) {
  return <section className={cn('glass-strong flex flex-col items-center gap-5 rounded-card px-4 py-10',
    flashing && 'motion-safe:animate-pulse motion-safe:bg-lime-soft')}>
    <h2 className="text-sm text-muted">REST · راحة</h2>
    <output dir="ltr" aria-live="polite" aria-atomic="true" className="text-8xl font-extrabold tabular-nums">{formatRest(remaining)}</output>
    <p className="text-center text-sm text-muted">الموبايل هيهتز، والشاشة هتنوّر في آخر 3 ثواني</p>
    <div className="flex gap-3">
      <Button variant="secondary" size="lg" onClick={onExtend}>+30 ث</Button>
      <Button variant="secondary" size="lg" onClick={onSkip}>تخطّي</Button>
    </div>
  </section>;
}
