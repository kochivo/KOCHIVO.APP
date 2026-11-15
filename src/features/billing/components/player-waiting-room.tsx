'use client';
import { Lock, Snowflake } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../packages/messages';

export function PlayerWaitingRoom({ frozen = false }: { frozen?: boolean }) {
  const t = useT(messages);
  const Icon = frozen ? Snowflake : Lock;
  return <section role="status" className="mx-auto grid max-w-lg place-items-center p-card">
    <div className="glass-strong flex flex-col items-center gap-card-gap rounded-card p-section text-center">
      <span className={frozen ? 'rounded-full bg-water/10 p-card text-water' : 'rounded-full bg-lime-soft p-card text-lime shadow-lime-glow'}>
        <Icon aria-hidden className="size-10" />
      </span>
      <h1 className="text-2xl font-bold">{t(frozen ? 'frozen' : 'pending')}</h1>
      <p className="text-muted">{t(frozen ? 'frozenBody' : 'waiting')}</p>
    </div>
  </section>;
}
