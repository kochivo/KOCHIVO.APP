export type InstallPlatform = 'installed' | 'android' | 'ios' | 'unsupported';

export function installPlatform({ userAgent, standalone, hasPromptEvent }: {
  userAgent: string; standalone: boolean; hasPromptEvent: boolean;
}): InstallPlatform {
  if (standalone) return 'installed';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  return hasPromptEvent ? 'android' : 'unsupported';
}
