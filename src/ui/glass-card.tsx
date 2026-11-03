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
}

export function GlassCard({ level = 'base', className, ...props }: GlassCardProps) {
  return <div className={cn('rounded-card', levels[level], className)} {...props} />;
}
