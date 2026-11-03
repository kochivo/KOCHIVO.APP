import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { requireAdmin } from './require-admin';

export async function fetchKpis() {
  const client = await requireAdmin();
  const t = await getT(messages);
  try {
    const { data, error } = await client.rpc('admin_notification_kpis');
    return { data: data?.[0] ?? null, error: error ? t('captainsFailed') : null };
  } catch (error) {
    unstable_rethrow(error);
    return { data: null, error: t('captainsFailed') };
  }
}
