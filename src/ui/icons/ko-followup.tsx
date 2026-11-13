import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoFollowup(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<circle cx="19.5" cy="5.5" r="2.6" />}>
    <path d="M3.5 13.5 6 5h10" /><path d="M20.5 11v9h-17v-6.5h5l1.5 2.5h4l1.5-2.5h5" />
  </KoIconSvg>;
}
