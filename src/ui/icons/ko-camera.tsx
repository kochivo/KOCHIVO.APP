import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoCamera(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="16.6" y="9.3" width="2" height="2" />}>
    <path d="M3.5 7.5h4l2-2.5h5l2 2.5h4V19h-17Z" /><circle cx="12" cy="13" r="3.4" />
  </KoIconSvg>;
}
