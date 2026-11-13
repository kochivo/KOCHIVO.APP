import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoForms(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="9" y="2.5" width="6" height="3.5" />}>
    <rect x="5" y="4.5" width="14" height="16" /><path d="m8.5 13 2.5 2.5 4.5-5" />
  </KoIconSvg>;
}
