import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoPlus(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="9.5" y="9.5" width="5" height="5" />}>
    <path d="M12 3.5v17M3.5 12h17" />
  </KoIconSvg>;
}
