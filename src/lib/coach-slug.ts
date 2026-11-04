const reserved = new Set(['admin', 'api', 'login', 'logout', 'signup', 'auth', 'captain', 'player',
  'settings', 'support', 'help', 'about', 'pricing', 'www', 'kochivo', 'demo', 'offline', 'null', 'undefined']);

export function coachSlug(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9-]{3,30}$/.test(value) && !reserved.has(value) ? value : null;
}
