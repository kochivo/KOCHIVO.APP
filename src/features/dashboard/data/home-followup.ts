import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { loadWorkspaceInbox, orderWorkspaceTasks, workspaceTriage } from '@/features/inbox/server';
import type { ReviewRow } from '../home/model';
import type { JoinPackage } from '../home/join-package-label';

async function loadJoinPackages(): Promise<Map<string, JoinPackage>> {
  try {
    const result = await (await supabaseServer()).rpc('pending_coach_join_packages');
    if (result.error) return new Map();
    return new Map((result.data ?? []).flatMap(row => row.package_id ? [[row.id,
      { days: row.package_days, sessions: row.package_sessions }] as const] : []));
  } catch (error) { unstable_rethrow(error); return new Map(); }
}

export async function loadHomeFollowup(now: Date) {
  const [data, packages] = await Promise.all([loadWorkspaceInbox(50, now.toISOString()), loadJoinPackages()]);
  const items = data.items.filter(item => !item.reviewed_at && item.kind !== 'request');
  const rows: ReviewRow[] = orderWorkspaceTasks(items, data.triage, now, 'all').flatMap(item => {
    if (item.kind === 'request') return [];
    const result = workspaceTriage(item, data.triage, now);
    return [{ id: item.id, playerId: item.player_id, name: item.player_name, kind: item.kind, at: item.created_at,
      title: item.kind === 'assessment' ? item.title : item.kind === 'form' ? item.exercise_name : '',
      flags: result.flags.length ? result.flags.map(flag => flag.key) : result.group === 'attention' ? ['assessmentAlert' as const] : [] }];
  });
  return { rows, count: data.counts ? data.counts.checkin + data.counts.form + data.counts.assessment : items.length,
    requests: data.items.filter(item => item.kind === 'request').map(item => {
      const selection = packages.get(item.id);
      return { id: item.id, name: item.player_name, at: item.created_at, ...(selection ? { package: selection } : {}) };
    }) };
}
