import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { adminCaptainActivitySchema, adminCaptainDetailSchema, adminDashboardSchema } from '../schemas';
import { requireAdmin } from './require-admin';

async function fetchDashboardRpc<T>(schema: z.ZodType<T>,
  query: (client: Awaited<ReturnType<typeof requireAdmin>>) => PromiseLike<{ data: unknown; error: unknown }>) {
  const client = await requireAdmin();
  const t = await getT(messages);
  try {
    const { data, error } = await query(client);
    const parsed = schema.safeParse(data);
    if (error || !parsed.success) return { data: null, error: t('captainsFailed') };
    return { data: parsed.data, error: null };
  } catch (error) {
    unstable_rethrow(error);
    return { data: null, error: t('captainsFailed') };
  }
}

export function fetchAdminDashboard() {
  return fetchDashboardRpc(adminDashboardSchema, client => client.rpc('admin_dashboard'));
}

export function fetchCaptainActivity(ids: string[]) {
  return fetchDashboardRpc(adminCaptainActivitySchema, async client => {
    if (!z.array(z.uuid()).max(100).safeParse(ids).success) return { data: null, error: true };
    return client.rpc('admin_captain_activity', { p_ids: ids });
  });
}

export function fetchCaptainDetail(id: string) {
  return fetchDashboardRpc(adminCaptainDetailSchema, async client => {
    if (!z.uuid().safeParse(id).success) return { data: null, error: true };
    return client.rpc('admin_captain_detail', { p_captain: id });
  });
}
