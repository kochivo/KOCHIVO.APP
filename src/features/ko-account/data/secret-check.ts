import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import type { KoActor } from './account';

// Fixed challenge the app HMACs with each env secret; the DB HMACs the same
// challenge with its stored key and answers only whether they match, so no
// secret value ever leaves its own side. The check RPC lives in public like
// the other ko RPCs: PostgREST only serves exposed schemas, and ko_private
// is deliberately not exposed, so a ko_private function would be unreachable.
const challenge = 'ko-secret-check';

// Cached per process per secret value, keyed by a hash of the values (never
// the values themselves): a DB secret rotation needs a restart, which is
// already true for env secrets.
let cached: { key: string; mismatches: string[] } | null = null;

async function checkSecret(actor: KoActor, kind: 'approval' | 'meal_receipt', secret: string): Promise<boolean> {
  try {
    const mac = createHmac('sha256', secret).update(challenge).digest('hex');
    const { data, error } = await actor.db.rpc(
      'ko_secret_check', { p_kind: kind, p_challenge: challenge, p_mac: mac });
    if (error) return false;
    return data === true;
  } catch {
    // Fail closed: an unreachable check is a mismatch, never a silent pass.
    return false;
  }
}

// Cached per process per approval-secret value, keyed by a hash of the value
// (never the value itself). Separate from the combined cache below: the
// route's pre-check only needs the approval secret.
let approvalCached: { key: string; mismatches: string[] } | null = null;

// The approval secret signs approval tokens and the usage-warning proof, so
// it is the only secret KO chat itself needs: its mismatch fails KO loudly
// before any usage is taken. The meal-receipt secret is not needed for the
// reply — it only signs the meal-points award at the end of a meal reply,
// which is skipped with a warning when the secret is missing or mismatched —
// so it must never block the reply itself.
export async function verifyKoApprovalSecret(actor: KoActor, config: { secret: string }): Promise<string[]> {
  const key = createHash('sha256').update(config.secret).digest('hex');
  if (approvalCached?.key === key) return approvalCached.mismatches;
  const mismatches: string[] = [];
  if (!(await checkSecret(actor, 'approval', config.secret))) mismatches.push('KO_APPROVAL_SECRET');
  if (mismatches.length) console.warn('KO secrets do not match the database:', mismatches.join(', '));
  approvalCached = { key, mismatches };
  return mismatches;
}

// Names only, never values: the caller warns with these and KO stays unavailable.
export async function verifyKoSecrets(actor: KoActor, config: { secret: string }): Promise<string[]> {
  const mealSecret = process.env.KO_MEAL_RECEIPT_SECRET;
  const key = createHash('sha256').update(`${config.secret}\n${mealSecret ?? ''}`).digest('hex');
  if (cached?.key === key) return cached.mismatches;
  const mismatches: string[] = [];
  if (!(await checkSecret(actor, 'approval', config.secret))) mismatches.push('KO_APPROVAL_SECRET');
  if (!mealSecret || !(await checkSecret(actor, 'meal_receipt', mealSecret))) mismatches.push('KO_MEAL_RECEIPT_SECRET');
  if (mismatches.length) console.warn('KO secrets do not match the database:', mismatches.join(', '));
  cached = { key, mismatches };
  return mismatches;
}
