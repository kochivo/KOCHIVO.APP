import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, body, action, className, ...props }: EmptyStateProps) {
  return (
    <div {...props} className={cn('glass flex flex-col items-center gap-3 rounded-card p-6 text-center', className)}>
      <Icon aria-hidden className="size-8 text-muted" />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="max-w-prose text-sm text-muted">{body}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
