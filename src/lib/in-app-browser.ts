export type InAppBrowser = 'instagram' | 'facebook' | 'messenger' | 'tiktok' | 'snapchat';

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/Instagram/i.test(userAgent)) return 'instagram';
  // Messenger also includes Facebook tokens, so it must be checked first.
  if (/Messenger|FBAN\/Orca/i.test(userAgent)) return 'messenger';
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'facebook';
  if (/musical_ly|BytedanceWebview/i.test(userAgent)) return 'tiktok';
  if (/Snapchat/i.test(userAgent)) return 'snapchat';
  return null;
}
