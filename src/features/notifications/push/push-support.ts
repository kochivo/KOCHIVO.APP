export interface PushEnvironment {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
}
export type PushSupport = 'supported' | 'unsupported' | 'ios-install';

export function pushSupport(environment: PushEnvironment): PushSupport {
  const ios = /iPad|iPhone|iPod/.test(environment.userAgent)
    || (environment.platform === 'MacIntel' && environment.maxTouchPoints > 1);
  if (ios && !environment.standalone) return 'ios-install';
  return environment.serviceWorker && environment.pushManager && environment.notification ? 'supported' : 'unsupported';
}

export function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}
