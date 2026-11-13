import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoInvite(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<circle cx="9" cy="8" r="3.4" />}>
    <path d="M3.5 20v-1c0-3.1 2.4-5.3 5.5-5.3s5.5 2.2 5.5 5.3v1M18 8v6M15 11h6" />
  </KoIconSvg>;
}
