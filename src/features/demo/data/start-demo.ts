import type { Locale } from '@/core/i18n/locale';
import { supabaseBrowser } from '@/core/supabase/browser';
import { demoError } from './demo-profile';

export async function startDemo(navigate: (path: string) => void, captchaToken?: string, locale: Locale = 'ar'): Promise<string | undefined> {
  try {
    const client = supabaseBrowser();
    // A retry after a failed workspace call must reuse the anonymous account, not mint another one.
    const { data } = await client.auth.getSession();
    if (!data.session?.user.is_anonymous) {
      const auth = captchaToken
        ? await client.auth.signInAnonymously({ options: { captchaToken } })
        : await client.auth.signInAnonymously();
      if (auth.error) return demoError(auth.error, locale);
    }
    const workspace = await client.rpc('create_demo_workspace');
    if (workspace.error) return demoError(workspace.error, locale);
    navigate('/captain');
  } catch (error) { return demoError(error, locale); }
}
