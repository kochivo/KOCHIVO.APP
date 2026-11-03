import type { Locale } from '@/core/i18n/locale';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { demoError, demoExpiry } from './demo-profile';

function staleSession(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return ['session_expired', 'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'user_not_found'].includes(String(code))
    || /profile required|(?:demo|workspace).*(?:expired|missing|not found)|(?:expired|missing).*workspace/i.test(String(message));
}

export async function startDemo(
  navigate: (path: string) => void, captchaToken?: string, locale: Locale = 'ar', now: () => number = Date.now,
): Promise<string | undefined> {
  try {
    const client = await loadSupabaseBrowser();
    const { data, error } = await client.auth.getSession();
    if (error && !staleSession(error)) return demoError(error, locale);
    const session = data.session;
    let replace = Boolean(error || (session && !session.user.is_anonymous));
    if (session?.user.is_anonymous && !replace) {
      const profile = await client.from('profiles').select('demo_expires_at').eq('id', session.user.id).maybeSingle();
      if (profile.error) {
        if (!staleSession(profile.error)) return demoError(profile.error, locale);
        replace = true;
      } else {
        const expiry = demoExpiry(profile.data);
        replace = !profile.data || Boolean(expiry && Date.parse(expiry) <= now());
      }
    }
    const signIn = async (signOut: boolean) => {
      if (signOut) {
        const result = await client.auth.signOut();
        if (result.error) return result.error;
      }
      const auth = captchaToken
        ? await client.auth.signInAnonymously({ options: { captchaToken } })
        : await client.auth.signInAnonymously();
      return auth.error;
    };
    if (!session || replace) {
      const failure = await signIn(replace);
      if (failure) return demoError(failure, locale);
    }
    // A plain network retry must reuse a usable anonymous account instead of minting another.
    let workspace = await client.rpc('create_demo_workspace');
    if (workspace.error && session?.user.is_anonymous && !replace && staleSession(workspace.error)) {
      const failure = await signIn(true);
      if (failure) return demoError(failure, locale);
      workspace = await client.rpc('create_demo_workspace');
    }
    if (workspace.error) return demoError(workspace.error, locale);
    navigate('/captain');
  } catch (error) { return demoError(error, locale); }
}
