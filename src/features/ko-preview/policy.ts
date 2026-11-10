import { koExpressions } from '@/ui/ko-avatar';
import type { KoExpression } from '@/ui/ko-avatar';

export { koExpressions };
export type { KoExpression };
export type KoRole = 'captain' | 'player';

export function koPreviewAllowed(mode: string | undefined, hostname: string): boolean {
  return mode === 'development' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

export function nextKoExpression(expression: KoExpression): KoExpression {
  return koExpressions[(koExpressions.indexOf(expression) + 1) % koExpressions.length] ?? 'welcome';
}
