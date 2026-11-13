import { useId } from 'react';
import type { ReactElement, ReactNode, SVGProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type KoIconProps = { className?: string; active?: boolean } & Omit<SVGProps<SVGSVGElement>, 'children'>;
export type KoIcon = (props: KoIconProps) => ReactElement;
export type NavIcon = LucideIcon | KoIcon;

export function KoIconSvg({ active = false, className, accent, children, ...props }: KoIconProps & {
  accent: ReactNode; children: ReactNode;
}) {
  const id = useId();
  const hatch = active ? 'text-lime' : 'text-ivory-hatch';
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    aria-hidden="true" {...props} focusable="false" fill="none" stroke="currentColor"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={cn(className, active ? 'text-ivory' : 'text-ivory-muted')}>
    <defs><pattern id={id} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0v2.2" strokeWidth={0.7} className={hatch} />
    </pattern></defs>
    {children}
    <g fill={`url(#${id})`} strokeWidth={0.8} className={hatch}>{accent}</g>
  </svg>;
}
