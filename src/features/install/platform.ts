export type InstallPlatform = 'installed' | 'android' | 'ios' | 'unsupported';

export function installPlatform({ userAgent, standalone, hasPromptEvent, maxTouchPoints = 0 }: {
  userAgent: string; standalone: boolean; hasPromptEvent: boolean; maxTouchPoints?: number;
}): InstallPlatform {
  if (standalone) return 'installed';
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  return hasPromptEvent ? 'android' : 'unsupported';
}
