export type KoContext =
  | { screen: 'player'; playerId: string }
  | { screen: 'program'; programId: string }
  | { screen: 'inbox' }
  | { screen: 'nutrition' }
  | { screen: 'home' };

export function contextFromPath(pathname: string): KoContext {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'ar' || parts[0] === 'en') parts.shift();
  const [role, section, id, tab] = parts;
  if (role === 'captain') {
    if (section === 'players' && id && (!tab || ['programs', 'nutrition', 'preview'].includes(tab)) && parts.length <= 4)
      return { screen: 'player', playerId: id };
    if (section === 'programs' && id && parts.length === 3) return { screen: 'program', programId: id };
    if (section === 'inbox' && parts.length === 2) return { screen: 'inbox' };
    if (section === 'nutrition' && id && parts.length === 3) return { screen: 'nutrition' };
  }
  if (role === 'player' && section === 'nutrition' && parts.length === 2) return { screen: 'nutrition' };
  return { screen: 'home' };
}
