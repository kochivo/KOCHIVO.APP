import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/ui/button';

export function DemoRow({ title = '', detail, time, children, onClick, target }: { title: string | undefined; detail?: string; time?: string; children?: ReactNode; onClick?: () => void; target?: string }) {
  const content = <><span className="grid size-10 shrink-0 place-items-center rounded-control bg-calm-soft text-xs text-calm" aria-hidden>{title.split(' ').map(w => w[0]).slice(0, 2).join(' ')}</span>
    <span className="min-w-0 flex-1 text-start"><b className="block text-row font-semibold">{title}</b>{detail && <small className="block text-xs text-muted">{detail}</small>}</span>{children}{time && <time className="ms-auto shrink-0 text-micro text-muted">{time}</time>}</>;
  return onClick ? <Button data-demo-target={target} block variant="secondary" className="w-full justify-start p-stack" onClick={onClick}>{content}<ChevronLeft aria-hidden className="dir-icon size-5 shrink-0" /></Button>
    : <div data-demo-target={target} className="recessed flex min-h-12 items-center gap-inline rounded-control p-stack">{content}</div>;
}
