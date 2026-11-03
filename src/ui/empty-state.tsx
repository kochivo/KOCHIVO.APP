import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

type Action = { label: string; onClick: () => void };
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Short numbered steps that tell the captain what fills this list. */
  steps?: string[];
  action?: Action;
  secondary?: Action;
}

export function EmptyState({ icon: Icon, title, body, steps, action, secondary, className, ...props }: EmptyStateProps) {
  return (
    <div {...props} className={cn('glass empty-state-in flex flex-col items-center gap-4 rounded-card px-6 py-8 text-center', className)}>
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-lime-soft text-lime ring-8 ring-lime-soft">
        <Icon className="size-7" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mx-auto max-w-prose text-sm text-muted">{body}</p>
      </div>
      {steps && steps.length > 0 && <ol className="grid w-full max-w-sm gap-2 text-start text-sm">
        {steps.map((step, index) => <li key={step} className="glass-raised flex min-h-12 items-center gap-3 rounded-control px-3 py-2">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-ink/5 font-display text-xs font-extrabold">{index + 1}</span>
          <span>{step}</span>
        </li>)}
      </ol>}
      {(action || secondary) && <div className="flex flex-wrap justify-center gap-2">
        {action && <Button className="min-h-12" onClick={action.onClick}>{action.label}</Button>}
        {secondary && <Button variant="ghost" className="min-h-12" onClick={secondary.onClick}>{secondary.label}</Button>}
      </div>}
    </div>
  );
}
