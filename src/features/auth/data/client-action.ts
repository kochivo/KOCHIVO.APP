import type { Locale } from '@/core/i18n/locale';
import { authError } from '../errors';
import type { ActionResult } from './auth-client';
import { clearDeviceRole } from '@/core/pwa/device-role';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from '../messages';

export async function callAuthAction(action: () => Promise<ActionResult>, locale: Locale = 'ar', t?: Translator<typeof messages>): Promise<ActionResult> {
  try {
    const result = await action();
    if (result.redirect === '/login') clearDeviceRole();
    return result;
  } catch (error) { return { error: authError(error, t ?? locale) }; }
}
