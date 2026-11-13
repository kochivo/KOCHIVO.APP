import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoPlayers(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<circle cx="9" cy="8" r="3.4" />}>
    <path d="M3.5 20v-1c0-3.1 2.4-5.3 5.5-5.3s5.5 2.2 5.5 5.3v1" /><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2" /><path d="M17.5 13.9c1.9.6 3 2.3 3 4.6V20" />
  </KoIconSvg>;
}
