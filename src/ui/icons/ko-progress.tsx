import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoProgress(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="16.5" y="3.5" width="4" height="4" />}>
    <path d="M4 4v16h16M7 15l4-4 4 2 5-7" /><path d="M7 18h13" strokeWidth={0.9} />
  </KoIconSvg>;
}
