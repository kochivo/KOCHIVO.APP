import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoPackages(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<path d="M12 12.6 3.6 8 12 3.4 20.4 8z" />}>
    <path d="M12 12.6 3.6 8 12 3.4 20.4 8zM3.6 8v8.4l8.4 4.6 8.4-4.6V8M12 12.6V21" />
  </KoIconSvg>;
}
