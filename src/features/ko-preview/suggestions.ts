import type { KoContext } from './context';
import type { KoRole } from './policy';

export function suggestionsFor(role: KoRole, context: KoContext | null, hasMessages = false) {
  if (hasMessages) return [];
  if (role === 'captain' && context?.screen === 'player') return ['suggest.player', 'suggest.program'] as const;
  if (role === 'captain') return ['suggest.today'] as const;
  return ['suggest.meal'] as const;
}
