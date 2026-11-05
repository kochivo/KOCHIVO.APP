import type { Locale } from '@/core/i18n/locale';
import { authError } from '../errors';
import type { ActionResult } from './auth-client';
import { clearDeviceRole } from '@/core/pwa/device-role';

export async function callAuthAction(action: () => Promise<ActionResult>, locale: Locale = 'ar'): Promise<ActionResult> {
  try {
    const result = await action();
    if (result.redirect === '/login') clearDeviceRole();
    return result;
  } catch (error) { return { error: authError(error, locale) }; }
}
