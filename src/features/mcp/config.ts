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

export function isMcpCaptain(id: string, profile: { role: string; suspended_at: string | null } | null) {
  return Boolean(mcpOrigin() && profile?.role === 'captain' && profile.suspended_at === null &&
    process.env.MCP_PILOT_USER_IDS?.split(',').some(pilot => pilot.trim() === id));
}
