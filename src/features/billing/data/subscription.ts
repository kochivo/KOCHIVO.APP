'use server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { fetchPlanSummary } from './plan-summary';
import { captainClient } from './client';

export async function loadSubscription() {
  if (!captainWorkspaceEnabled()) throw new Error('Workspace disabled');
  const summary = await fetchPlanSummary();
  if (!summary) throw new Error('Plan unavailable');
  const { client, captainId } = await captainClient();
  const now = new Date().toISOString();
  const subscription = await client.from('captain_subscriptions').select('ends_at').eq('captain_id', captainId).eq('tier', summary.plan.tier)
    .lte('starts_at', now).gt('ends_at', now).order('ends_at', { ascending: false }).limit(1).maybeSingle();
  if (subscription.error) throw new Error('Subscription unavailable');
  return { ...summary, subscriptionEnd: subscription.data?.ends_at ?? null };
}
