import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { KoExpression } from '../policy';
import { koExpressions } from '../policy';

export function KoAvatar({ expression, className, motion = 'none' }: {
  expression: KoExpression; className?: string; motion?: 'idle' | 'none';
}) {
  return <span aria-hidden className={cn('relative inline-grid shrink-0', motion === 'idle' && 'animate-[ko-breathe_3.5s_ease-in-out_infinite] motion-reduce:animate-none', className)}>
    {koExpressions.map(value => <Image key={value} src={`/ko-preview/${value}.png`} width={160} height={160} sizes="160px" alt="" draggable={false}
      className={cn('col-start-1 row-start-1 size-full object-contain transition-opacity duration-200 motion-reduce:transition-none', value === expression ? 'opacity-100' : 'opacity-0')} />)}
  </span>;
}
