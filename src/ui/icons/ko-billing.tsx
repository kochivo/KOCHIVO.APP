import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoBilling(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="6" y="13.5" width="5" height="2.2" />}>
    <rect x="3" y="6" width="18" height="12.5" /><path d="M3 10.5h18" />
  </KoIconSvg>;
}
