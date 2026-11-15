'use client';
import { useT } from '@/core/i18n/client';
import type { PainLoadHint as Hint } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain-controls/messages';

export function PainLoadHint({ hint, today, weight, onSkip }: { hint?: Hint; today: string; weight: number; onSkip: () => void }) {
  const t = useT(messages);
  if (!hint || hint.until < today) return null;
  return <div className="glass-strong space-y-stack rounded-card p-card" role="status">
    <p>{hint.factor === 0 ? t('rest') : t('reduced', { weight })}</p>
    {hint.factor === 0 && <Button variant="secondary" onClick={onSkip}>{t('skip')}</Button>}
  </div>;
}
