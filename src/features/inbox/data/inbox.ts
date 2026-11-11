'use server';
import { exerciseName } from '@/lib/display-name';
import { getLocale } from '@/core/i18n/server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { reviewItemAt } from './inbox-internal';

import 'server-only';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { inboxClient } from './client';
import { mergeInbox } from '../merge';
import type { InboxItem, Result } from '../types';

const identity = z.object({ kind: z.enum(['form', 'checkin']), id: z.uuid() });
const tableFor = (kind: InboxItem['kind']) => kind === 'form' ? 'form_checks' as const : 'check_ins' as const;
const cursorSchema = z.object({ created_at: z.iso.datetime({ offset: true }), id: z.uuid() });
type InboxCursor = z.infer<typeof cursorSchema>;
const fraction = (at: string) => Number(`0.${at.match(/\.(\d+)/)?.[1] ?? '0'}`);

export async function listInbox(input: { status: 'open' | 'reviewed'; limit: 50; cursor?: InboxCursor }): Promise<Result<InboxItem[]> & { nextCursor?: InboxCursor | null }> {
  const t = await getT(messages);
  const locale = await getLocale();
  const parsed = z.object({ status: z.enum(['open', 'reviewed']), limit: z.literal(50), cursor: cursorSchema.optional() }).safeParse(input);
  if (!parsed.success) return { error: t('chooseList') };
  try {
    const client = await inboxClient();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('signIn') };
    const reviewed = parsed.data.status === 'reviewed';
    const formRows = client.from('form_checks').select('*').eq('captain_id', auth.data.claims.sub);
    const checkRows = client.from('check_ins').select('*').eq('captain_id', auth.data.claims.sub);
    const formQuery = (reviewed ? formRows.not('reviewed_at', 'is', null) : formRows.is('reviewed_at', null))
      .order(reviewed ? 'reviewed_at' : 'created_at', { ascending: false }).order('id');
    const checkQuery = (reviewed ? checkRows.not('reviewed_at', 'is', null) : checkRows.is('reviewed_at', null))
      .order(reviewed ? 'reviewed_at' : 'created_at', { ascending: false }).order('id');
    const cursor = !reviewed ? parsed.data.cursor : undefined;
    if (cursor) {
      const filter = `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`;
      formQuery.or(filter);
      checkQuery.or(filter);
    }
    const [forms, checks] = await Promise.all([formQuery.limit(50), checkQuery.limit(50)]);
    if (forms.error || checks.error || !forms.data || !checks.data) throw new Error();
    const playerIds = [...new Set([...forms.data, ...checks.data].map((row) => row.player_id))];
    const exerciseIds = [...new Set(forms.data.map((row) => row.exercise_id))];
    const [players, exercises] = await Promise.all([
      playerIds.length ? client.from('profiles').select('id,full_name').in('id', playerIds) : Promise.resolve({ data: [], error: null }),
      exerciseIds.length ? client.from('exercises').select('id,name_ar,name_en').in('id', exerciseIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (players.error || exercises.error) throw new Error();
    const base = (row: { id: string; player_id: string; created_at: string; reviewed_at: string | null; captain_reply: string | null }) => ({
      id: row.id, player_id: row.player_id, player_name: players.data?.find((p) => p.id === row.player_id)?.full_name ?? t('player'),
      created_at: row.created_at, reviewed_at: row.reviewed_at, reply: row.captain_reply,
    });
    let data = mergeInbox(forms.data.map((row) => ({ ...base(row), kind: 'form', note: row.note,
      exercise_name: exerciseName(exercises.data?.find((e) => e.id === row.exercise_id) ?? {}, locale) || t('exercise') })),
    checks.data.map((row) => ({ ...base(row), kind: 'checkin', week_start: row.week_start,
      body_weight_kg: row.body_weight_kg, waist_cm: row.waist_cm, notes: row.notes })));
    // Select the newest reviews across both tables, then preserve the inbox's creation ordering.
    if (reviewed) {
      const ids = new Set([...data].sort((a, b) => Date.parse(b.reviewed_at ?? '') - Date.parse(a.reviewed_at ?? '') || a.id.localeCompare(b.id)).slice(0, 50).map((row) => `${row.kind}:${row.id}`));
      data = data.filter((row) => ids.has(`${row.kind}:${row.id}`));
    }
    if (reviewed) return { data };
    // PostgreSQL keeps microseconds; Date.parse alone can move rows across a page boundary.
    data.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      || fraction(b.created_at) - fraction(a.created_at) || a.id.localeCompare(b.id));
    data = data.slice(0, 50);
    const last = data.at(-1);
    return { data, nextCursor: data.length === 50 && last ? { created_at: last.created_at, id: last.id } : null };
  } catch (error) { unstable_rethrow(error); return { error: t('loadFailed') }; }
}

export async function reviewItem(input: unknown): Promise<Result<true>> {
  return reviewItemAt(input, new Date());
}

export async function mediaUrls(input: unknown): Promise<Result<string[]>> {
  const t = await getT(messages);
  const parsed = identity.safeParse(input);
  if (!parsed.success) return { error: t('notFound') };
  try {
    const client = await inboxClient();
    // Signing private media requires a fresh Auth server check.
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) return { error: t('signIn') };
    const row = await client.from(tableFor(parsed.data.kind)).select('*')
      .eq('id', parsed.data.id).eq('captain_id', auth.data.user.id).single();
    if (row.error || !row.data) throw new Error();
    const paths = 'video_path' in row.data ? [row.data.video_path] : row.data.photo_paths.slice(0, 3);
    if (!paths.length) return { data: [] };
    const result = await client.storage.from(parsed.data.kind === 'form' ? 'form-videos' : 'checkin-photos').createSignedUrls(paths, 600);
    if (result.error || !result.data || result.data.some((file) => file.error || !file.signedUrl)) throw new Error();
    return { data: result.data.flatMap((file) => file.signedUrl ? [file.signedUrl] : []) };
  } catch (error) { unstable_rethrow(error); return { error: t('mediaFailed') }; }
}
