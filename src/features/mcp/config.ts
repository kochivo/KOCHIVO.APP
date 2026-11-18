import 'server-only';

export function mcpOrigin() {
  const { MCP_ENABLED, KO_ORIGIN } = process.env;
  if (MCP_ENABLED !== '1' || !KO_ORIGIN) return null;
  try {
    const url = new URL(KO_ORIGIN);
    if (url.origin === KO_ORIGIN && (url.protocol === 'https:' ||
      (process.env.NODE_ENV !== 'production' && url.protocol === 'http:'))) return url.origin;
  } catch {
    return null;
  }
  return null;
}

export function isMcpEligible(id: string, profile: { role: string; role_confirmed: boolean; suspended_at: string | null } | null):
  profile is { role: 'captain' | 'player'; role_confirmed: true; suspended_at: null } {
  const pilots = process.env.MCP_PILOT_USER_IDS;
  return Boolean(mcpOrigin() && (profile?.role === 'captain' || profile?.role === 'player') &&
    profile.role_confirmed && profile.suspended_at === null &&
    (pilots?.trim() === '*' || pilots?.split(',').some(pilot => pilot.trim() === id)));
}
