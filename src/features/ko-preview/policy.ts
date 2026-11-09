export type KoExpression = 'welcome' | 'thinking' | 'cheer';
export type KoRole = 'captain' | 'player';
export const koExpressions: readonly KoExpression[] = ['welcome', 'thinking', 'cheer'];

export function koPreviewAllowed(mode: string | undefined, hostname: string): boolean {
  return mode === 'development' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

export function nextKoExpression(expression: KoExpression): KoExpression {
  return koExpressions[(koExpressions.indexOf(expression) + 1) % koExpressions.length] ?? 'welcome';
}
