'use client';

import { useId } from 'react';
import type { ComponentProps } from 'react';
import { useInView } from '@/lib/use-in-view';
import { MedalArt } from './medal-art';

export function Medal(props: Omit<ComponentProps<typeof MedalArt>, 'id' | 'paints'>) {
  const id = useId();
  const motionRef = useInView<HTMLSpanElement>();
  const art = <MedalArt {...props} id={id} />;
  return props.shine && !props.locked ? <span ref={motionRef} className="inline-flex shrink-0">
    <style>{`.medal-shine { animation: medal-shine 4.5s ease-in-out infinite; animation-play-state: paused; }
      [data-motion-running='true'] > svg .medal-shine { animation-play-state: running; }
      @media (prefers-reduced-motion: reduce) { .medal-shine { animation: none; opacity: 0; } }`}</style>
    {art}
  </span> : art;
}
