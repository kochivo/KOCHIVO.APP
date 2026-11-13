import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoHome(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="10" y="14" width="4" height="6" />}>
    <path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" />
  </KoIconSvg>;
}
