import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoMealPlans(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="11" y="14" width="6" height="3.5" />}>
    <rect x="4" y="3.5" width="16" height="17" rx="1" /><path d="M8 3.5v17M11 8h6M11 11h4" strokeWidth={0.9} />
  </KoIconSvg>;
}
