import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Level = 'base' | 'raised' | 'strong';

const levels: Record<Level, string> = {
  base: 'glass',
  raised: 'glass-raised',
  strong: 'glass-strong',
};

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 'strong' for gym focus mode and big numbers (highest contrast). See globals.css. */
  level?: Level;
  interactive?: boolean;
}

export function GlassCard({ level = 'base', interactive = false, className, ...props }: GlassCardProps) {
  const hasPadding = /(?:^|\s)(?:[\w-]+:)*!?p(?:[xysebt])?-/.test(className ?? '');
  return <div className={cn('enter rounded-card', !hasPadding && 'p-6', interactive && 'press', levels[level], className)} {...props} />;
}
