import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoGallery(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<circle cx="15.5" cy="9" r="1.8" />}>
    <rect x="3.5" y="4.5" width="17" height="15" /><path d="m3.5 17 5-5 4 4 3-3 5 5" />
  </KoIconSvg>;
}
