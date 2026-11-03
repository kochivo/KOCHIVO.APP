import type { Locale } from '@/core/i18n/locale';
import { authError } from '../errors';
import type { ActionResult } from './auth-client';

export async function callAuthAction(action: () => Promise<ActionResult>, locale: Locale = 'ar'): Promise<ActionResult> {
  try { return await action(); } catch (error) { return { error: authError(error, locale) }; }
}
