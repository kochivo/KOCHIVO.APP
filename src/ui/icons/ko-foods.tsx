import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoFoods(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<path d="M12 9c0-3 2-5 5.5-5 0 3-2 5-5.5 5Z" />}>
    <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z" /><path d="M12 9v3.5" />
  </KoIconSvg>;
}
