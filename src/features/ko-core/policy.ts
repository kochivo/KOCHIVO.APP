export type KoRole = 'captain' | 'player';

export function koPreviewAllowed(mode: string | undefined, hostname: string): boolean {
  return mode === 'development' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}
