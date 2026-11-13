import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoSettings(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="14" y="5" width="4" height="4" />}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><rect x="6" y="15" width="4" height="4" />
  </KoIconSvg>;
}
