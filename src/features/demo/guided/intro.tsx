import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';

export function Intro({ onChoose }: { onChoose: (n: number) => void }) {
  const t = useT(guidedMessages);
  return <main className="demo-intro grid min-h-dvh place-items-center p-page-x">
    <section aria-labelledby="demo-question" className="glass-strong grid w-full max-w-lg gap-section rounded-card p-card text-center">
      <p className="rounded-full border border-line p-stack text-micro text-muted">{t('label')}</p>
      <h1 id="demo-question" className="font-display text-h font-semibold">{t('question')}</h1>
      <p className="text-sm text-muted">{t('introDetail')}</p>
      <div className="grid grid-cols-2 gap-card-gap">
        {[5, 20, 40, 100].map((n, i) => <Button key={n} variant="secondary" className="min-h-24 flex-col" onClick={() => onChoose(n)}>
          <b className="text-stat tabular-nums" dir="ltr">{t('sizes').split('|')[i]}</b>
          <span className="text-xs text-muted">{t('sizeHints').split('|')[i]}</span>
        </Button>)}
      </div>
      <Button variant="secondary" onClick={() => onChoose(18)}>{t('skip')}</Button>
    </section>
  </main>;
}
