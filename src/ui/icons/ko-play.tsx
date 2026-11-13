import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoPlay(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<path d="m9.5 7.5 7 4.5-7 4.5Z" />}>
    <circle cx="12" cy="12" r="9" />
  </KoIconSvg>;
}
