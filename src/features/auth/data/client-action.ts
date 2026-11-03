import { authError } from '../errors';
import type { ActionResult } from './auth-client';

export async function callAuthAction(action: () => Promise<ActionResult>): Promise<ActionResult> {
  try { return await action(); } catch (error) { return { error: authError(error) }; }
}
