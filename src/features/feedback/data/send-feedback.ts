import { publicConfig } from '@/lib/public-config';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { DeviceRole } from '@/core/pwa/device-role';

export type FeedbackResult = { error?: 'validation' | 'failed' };

export async function sendFeedback(input: string, role: DeviceRole): Promise<FeedbackResult> {
  const message = input.trim();
  if (message.length < 5 || message.length > 1000) return { error: 'validation' };
  if (!publicConfig.sentryDsn) return { error: 'failed' };
  try {
    const { data, error } = await (await loadSupabaseBrowser()).auth.getSession();
    const id = data.session?.user.id;
    if (error || !id) return { error: 'failed' };
    const { captureUserFeedback } = await import('@/core/telemetry/user-feedback');
    const delivered = await captureUserFeedback({ message, url: location.href, role, id });
    return delivered ? {} : { error: 'failed' };
  } catch { return { error: 'failed' }; }
}
