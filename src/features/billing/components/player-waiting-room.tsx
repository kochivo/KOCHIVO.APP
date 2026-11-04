'use client';
import { Lock, Snowflake } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../packages/messages';

export function PlayerWaitingRoom({ frozen = false }: { frozen?: boolean }) {
  const t = useT(messages);
  const Icon = frozen ? Snowflake : Lock;
  return <section role="status" className="mx-auto grid min-h-80 max-w-lg place-items-center p-5">
    <div className="glass-strong flex flex-col items-center gap-5 rounded-card p-8 text-center">
      <span className={frozen ? 'rounded-full bg-water/10 p-5 text-water' : 'rounded-full bg-lime-soft p-5 text-lime shadow-lime-glow'}>
        <Icon aria-hidden className="size-10" />
      </span>
      <h1 className="text-2xl font-bold">{t(frozen ? 'frozen' : 'pending')}</h1>
      <p className="text-muted">{t(frozen ? 'frozenBody' : 'waiting')}</p>
    </div>
  </section>;
}
