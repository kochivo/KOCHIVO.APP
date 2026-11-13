import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoMic(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="10.5" y="6" width="3" height="4" rx="1" />}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M6 10.5v1a6 6 0 0 0 12 0v-1M12 17.5v3M8.5 20.5h7" />
  </KoIconSvg>;
}
