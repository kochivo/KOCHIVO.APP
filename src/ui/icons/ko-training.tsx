import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoTraining(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="4.5" y="7" width="3.5" height="10" />}>
    <path d="M8 12h8" /><rect x="16" y="7" width="3.5" height="10" /><path d="M2.5 10v4M21.5 10v4" />
  </KoIconSvg>;
}
