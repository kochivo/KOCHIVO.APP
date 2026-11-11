import { koExpressions } from '@/ui/ko-avatar';
import type { KoExpression } from '@/ui/ko-avatar';

export { koExpressions };
export type { KoExpression };
export type { KoRole } from '@/features/ko-core';
export { koPreviewAllowed } from '@/features/ko-core';


export function nextKoExpression(expression: KoExpression): KoExpression {
  return koExpressions[(koExpressions.indexOf(expression) + 1) % koExpressions.length] ?? 'welcome';
}
