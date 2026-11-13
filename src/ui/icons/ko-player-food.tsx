import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoPlayerFood(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<path d="M13.5 9a3.5 3.5 0 0 1 3.5 3.5h-3.5Z" />}>
    <circle cx="13.5" cy="12.5" r="7" /><path d="M3 4v6c0 1 1 1.5 2 1.5V20M5 4v6M18.5 4v3" />
  </KoIconSvg>;
}
