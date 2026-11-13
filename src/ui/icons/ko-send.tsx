import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoSend(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<path d="m5.5 10.5 4 1.7 1-4Z" />}>
    <path d="M20.5 3.5 3.5 10.5l7 3 3 7Z" /><path d="m10.5 13.5 5-5" strokeWidth={0.9} />
  </KoIconSvg>;
}
