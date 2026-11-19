import 'server-only';
import { supabaseServer } from '@/core/supabase/server';

export function koTeaserEnabled(): boolean {
  return process.env.KO_TEASER_ENABLED === '1';
}

// Names only, never values: tells the owner which KO setting is off when KO stays unavailable.
function koConfigProblems(): string[] {
  const { KO_ENABLED, KO_GEMINI_PAID, KO_ORIGIN, KO_APPROVAL_SECRET, KO_PILOT_USER_IDS, GOOGLE_GENERATIVE_AI_API_KEY } = process.env;
  const problems = [
    KO_ENABLED !== '1' && 'KO_ENABLED must be 1',
    KO_GEMINI_PAID !== '1' && 'KO_GEMINI_PAID must be 1',
    (!KO_APPROVAL_SECRET || KO_APPROVAL_SECRET.length < 32) && 'KO_APPROVAL_SECRET must be at least 32 characters',
    !KO_PILOT_USER_IDS && 'KO_PILOT_USER_IDS is empty',
    !GOOGLE_GENERATIVE_AI_API_KEY && 'GOOGLE_GENERATIVE_AI_API_KEY is empty',
  ].filter((problem): problem is string => typeof problem === 'string');
  try {
    const origin = new URL(KO_ORIGIN ?? '');
    if (origin.origin !== KO_ORIGIN) problems.push('KO_ORIGIN must be a bare origin like https://example.com');
    else if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') problems.push('KO_ORIGIN must use https');
  } catch {
    problems.push('KO_ORIGIN is not a valid URL');
  }
  return problems;
}

let warned = false;
function unavailable() {
  if (!warned) {
    warned = true;
    const problems = koConfigProblems();
    if (problems.length) console.warn('KO is unavailable:', problems.join('; '));
  }
  return null;
}

export function koAccountConfig() {
  const { KO_ENABLED, KO_GEMINI_PAID, KO_ORIGIN, KO_APPROVAL_SECRET, KO_PILOT_USER_IDS, GOOGLE_GENERATIVE_AI_API_KEY } = process.env;
  if (KO_ENABLED !== '1' || KO_GEMINI_PAID !== '1' || !KO_ORIGIN || !KO_APPROVAL_SECRET ||
      KO_APPROVAL_SECRET.length < 32 || !KO_PILOT_USER_IDS || !GOOGLE_GENERATIVE_AI_API_KEY) return unavailable();
  try {
    const origin = new URL(KO_ORIGIN);
    if (origin.origin !== KO_ORIGIN || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) return unavailable();
    const ids = new Set(KO_PILOT_USER_IDS.split(',').map(id => id.trim()));
    // KO_PILOT_USER_IDS='*' opens KO to every signed-in account, matching MCP_PILOT_USER_IDS.
    const pilots: Pick<ReadonlySet<string>, 'has'> = { has: id => ids.has('*') || ids.has(id) };
    return { origin, secret: KO_APPROVAL_SECRET, key: GOOGLE_GENERATIVE_AI_API_KEY, pilots };
  } catch {
    return null;
  }
}

export async function koPilotAvailable(): Promise<boolean> {
  const config = koAccountConfig();
  if (!config) return false;
  const db = await supabaseServer();
  const { data, error } = await db.auth.getClaims();
  const id = data?.claims.sub;
  return !error && Boolean(id && config.pilots.has(id) && data?.claims.is_anonymous !== true);
}
