export type AuthMode = 'login' | 'signup';

export function authMode(tab: unknown): AuthMode {
  return tab === 'signup' ? 'signup' : 'login';
}
