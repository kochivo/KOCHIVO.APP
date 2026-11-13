import { KoIconSvg } from './ko-icon';
import type { KoIconProps } from './ko-icon';

export function KoCaptainChat(props: KoIconProps) {
  return <KoIconSvg {...props} accent={<rect x="6.5" y="7.5" width="10" height="3" />}>
    <path d="M20.5 15.5a3 3 0 0 1-3 3h-8l-5 2v-5a3 3 0 0 1-2-3v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" /><path d="M6.5 14h6" strokeWidth={0.9} />
  </KoIconSvg>;
}
