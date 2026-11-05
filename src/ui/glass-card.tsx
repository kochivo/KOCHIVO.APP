import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Level = 'base' | 'raised' | 'strong' | 'featured';

const levels: Record<Level, string> = {
  base: 'glass',
  raised: 'glass-raised',
  strong: 'glass-strong',
  featured: 'glass-featured',
};

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 'strong' for gym focus mode and big numbers (highest contrast). See globals.css. */
  level?: Level;
  interactive?: boolean;
  padding?: 'sm' | 'md';
}

export function GlassCard({ level = 'base', interactive = false, padding = 'md', className, ...props }: GlassCardProps) {
  const hasPadding = /(?:^|\s)(?:[\w-]+:)*!?p(?:[xysebt])?-/.test(className ?? '');
  return <div className={cn('enter rounded-card', !hasPadding && (padding === 'sm' ? 'p-3 md:p-4' : 'p-card md:p-6'), interactive && 'press hover-lift', levels[level], className)} {...props} />;
}
