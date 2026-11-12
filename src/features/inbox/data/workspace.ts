'use server';
import 'server-only';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { formsAccess } from '@/features/forms/server';
import { matchesAlert } from '@/features/forms';
import { loadFollowupHistory } from './followup-history';
import { getT } from '@/core/i18n/server';
import { workspaceMessages } from '../workspace-messages';
import { listInbox } from './inbox';
import { listTriageInputs } from './triage-inputs';
import type { WorkspaceInboxData, AssessmentItem, ReviewCursor } from '../workspace-types';

export async function loadWorkspaceReviews(input: { at: string; cursor?: ReviewCursor }) {
  const t = await getT(workspaceMessages);
  try { return await loadFollowupHistory(input); }
  catch (error) { unstable_rethrow(error); throw new Error(t('loadFailed')); }
}

export async function loadWorkspaceInbox(limit = 50, snapshotAt?: string): Promise<WorkspaceInboxData> {
  const t = await getT(workspaceMessages);
  try {
    z.number().int().min(50).max(500).parse(limit);
    const { client, captain } = await formsAccess();
    const at = snapshotAt === undefined ? new Date().toISOString() : z.iso.datetime().parse(snapshotAt);
    const lateAt = new Date(Date.parse(at) - 86_400_000).toISOString();
    const [open, forms, joins, checksCount, videosCount, lateCounts, reviews, tiers] = await Promise.all([
      listInbox({ status: 'open', limit: 50 }),
      client.from('form_requests').select(`id,player_id,answered_at,reviewed_at,captain_reply,
        profiles!form_requests_player_id_fkey(full_name),forms!form_requests_form_id_fkey(title),
        form_answers(id,value,photo_paths,form_questions(label_ar,label_en,position,options,alert_on))`, { count: 'exact' })
        .eq('captain_id', captain).not('answered_at', 'is', null).is('reviewed_at', null)
        .order('answered_at', { ascending: true }).order('id').limit(limit),
      client.rpc('pending_coach_join_requests'),
      client.from('check_ins').select('created_at', { count: 'exact' }).eq('captain_id', captain).is('reviewed_at', null).order('created_at').limit(1),
      client.from('form_checks').select('created_at', { count: 'exact' }).eq('captain_id', captain).is('reviewed_at', null).order('created_at').limit(1),
      Promise.all((['check_ins', 'form_checks', 'form_requests'] as const).map(table => {
        const query = client.from(table).select('id', { count: 'exact', head: true }).eq('captain_id', captain).is('reviewed_at', null);
        if (table === 'form_requests') query.not('answered_at', 'is', null);
        return query.lt(table === 'form_requests' ? 'answered_at' : 'created_at', lateAt);
      })),
      loadWorkspaceReviews({ at }),
      client.rpc('captain_player_tiers'),
    ]);
    if (open.error || forms.error || joins.error || checksCount.error || videosCount.error || tiers.error || lateCounts.some(row => row.error)) throw new Error(t('loadFailed'));
    const tierMap = new Map(tiers.data.map(t => [t.player_id, t]));
    const checkins = open.data ?? [];
    let cursor = open.nextCursor;
    while (cursor && checkins.length < limit) {
      const page = await listInbox({ status: 'open', limit: 50, cursor });
      if (page.error) throw new Error(page.error);
      checkins.push(...page.data ?? []); cursor = page.nextCursor;
    }
    const assessments: AssessmentItem[] = forms.data.flatMap(row => row.answered_at ? [{
      kind: 'assessment', id: row.id, player_id: row.player_id, player_name: row.profiles?.full_name ?? '',
      title: row.forms?.title ?? '', created_at: row.answered_at, reviewed_at: row.reviewed_at, reply: row.captain_reply,
      answers: [...row.form_answers].sort((a, b) => (a.form_questions?.position ?? 0) - (b.form_questions?.position ?? 0)).map(answer => ({
        id: answer.id, label_ar: answer.form_questions?.label_ar ?? '', label_en: answer.form_questions?.label_en ?? '',
        value: answer.value, photoCount: answer.photo_paths.length,
        alert: matchesAlert(z.object({ operator: z.enum(['eq', 'gt', 'lt']), value: z.union([z.string(), z.number(), z.boolean()]) }).nullable().parse(answer.form_questions?.alert_on ?? null), answer.value),
        options: z.array(z.object({ value: z.string(), label_ar: z.string(), label_en: z.string() })).parse(answer.form_questions?.options ?? []),
      })),
    }] : []);
    const extra = await listTriageInputs([...new Set([...checkins, ...reviews.items].filter(item => item.kind === 'checkin').map(item => item.player_id))], at);
    if (extra.error) throw new Error(extra.error);
    return { items: [...checkins, ...assessments, ...reviews.items, ...joins.data.map(row => ({ kind: 'request' as const, id: row.id,
      player_name: row.full_name, created_at: row.created_at, reviewed_at: null }))]
      .map(item => ({ ...item, tier: 'player_id' in item ? tierMap.get(item.player_id) ?? null : null }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)),
    triage: extra.data ?? { history: [], dailyChecks: [] }, at, limit, weekAt: reviews.weekAt,
    oldest: [...(checksCount.data ?? []), ...(videosCount.data ?? []), ...assessments, ...joins.data].map(row => row.created_at).sort()[0] ?? null,
    statusCounts: { completed: reviews.counts, overdue: {
      checkin: lateCounts[0]?.count ?? 0, form: lateCounts[1]?.count ?? 0, assessment: lateCounts[2]?.count ?? 0,
      request: joins.data.filter(row => row.created_at < lateAt).length,
      all: lateCounts.reduce((sum, row) => sum + (row.count ?? 0), 0) + joins.data.filter(row => row.created_at < lateAt).length,
    } },
    reviews: { more: reviews.more, cursor: reviews.cursor, total: reviews.total }, more: Boolean(cursor) || (forms.count ?? 0) > forms.data.length,
    counts: { checkin: checksCount.count ?? 0, form: videosCount.count ?? 0, assessment: forms.count ?? 0, request: joins.data.length,
      all: (checksCount.count ?? 0) + (videosCount.count ?? 0) + (forms.count ?? 0) + joins.data.length } };
  } catch (error) { unstable_rethrow(error); throw new Error(t('loadFailed')); }
}

export async function reviewAssessment(input: unknown) {
  const t = await getT(workspaceMessages);
  try {
    const { id, reply } = z.object({ id: z.uuid(), reply: z.string().trim().max(1000) }).parse(input);
    const { client, captain } = await formsAccess();
    const result = await client.from('form_requests').update({ captain_reply: reply || null, reviewed_at: new Date().toISOString() })
      .eq('id', id).eq('captain_id', captain).not('answered_at', 'is', null).select('id').single();
    if (result.error) throw result.error;
    return { ok: true };
  } catch (error) { unstable_rethrow(error); return { error: t('failed') }; }
}

export async function assessmentPhotos(id: string) {
  const t = await getT(workspaceMessages);
  try {
    z.uuid().parse(id);
    const { client, captain } = await formsAccess();
    // Fresh user verification is required before signing private media.
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error();
    const result = await client.from('form_requests').select('form_answers(id,photo_paths)').eq('id', id).eq('captain_id', captain).single();
    if (result.error) throw result.error;
    const paths = result.data.form_answers.flatMap(answer => answer.photo_paths.map(path => ({ id: answer.id, path })));
    if (!paths.length) return { data: [] };
    const signed = await client.storage.from('checkin-photos').createSignedUrls(paths.map(photo => photo.path), 600);
    if (signed.error || signed.data.some(photo => !photo.signedUrl || photo.error)) throw new Error();
    return { data: signed.data.flatMap((photo, index) => {
      const path = paths[index];
      return path && photo.signedUrl ? [{ id: path.id, url: photo.signedUrl }] : [];
    }) };
  } catch (error) { unstable_rethrow(error); return { error: t('photosFailed') }; }
}
