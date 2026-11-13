import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoTemplate(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="13.5" y="12" width="7" height="8" />}>
    <rect x="3.5" y="4" width="17" height="5" /><rect x="3.5" y="12" width="7" height="8" />
  </KoIconSvg>;
}
