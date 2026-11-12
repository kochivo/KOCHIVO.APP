import 'server-only';
import { z } from 'zod';
import { formsAccess } from '@/features/forms/server';
import { matchesAlert } from '@/features/forms';
import { getLocale } from '@/core/i18n/server';
import { getTimezone } from '@/core/timezone/server';
import { exerciseName } from '@/lib/display-name';
import { profileTimezone, timezoneMidnight } from '@/lib/timezone';
import { localDate, saturdayWeek } from '@/lib/dates';

function weekStart(now: Date, timezone: string): number {
  const today = localDate(now, timezone);
  return timezoneMidnight(saturdayWeek(today)[0] ?? today, timezone);
}

const cursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid(), kind: z.enum(['checkin', 'form', 'assessment']) });
export type FollowupReviewCursor = z.infer<typeof cursorSchema>;
const fraction = (at: string) => Number(`0.${at.match(/\.(\d+)/)?.[1] ?? '0'}`);
export async function loadFollowupHistory(input: { at: string; cursor?: FollowupReviewCursor }) {
  const parsed = z.object({ at: z.iso.datetime({ offset: true }), cursor: cursorSchema.optional() }).parse(input);
  const { client, captain } = await formsAccess();
  const locale = await getLocale();
  const weekAt = new Date(weekStart(new Date(parsed.at), await getTimezone())).toISOString();
  const checks = client.from('check_ins').select(`id,player_id,created_at,reviewed_at,captain_reply,week_start,body_weight_kg,waist_cm,notes,
    profiles!check_ins_player_id_fkey(full_name,timezone)`, { count: 'exact' }).eq('captain_id', captain).not('reviewed_at', 'is', null);
  const videos = client.from('form_checks').select(`id,player_id,created_at,reviewed_at,captain_reply,note,
    profiles!form_checks_player_id_fkey(full_name,timezone),exercises(name_ar,name_en)`, { count: 'exact' }).eq('captain_id', captain).not('reviewed_at', 'is', null);
  const forms = client.from('form_requests').select(`id,player_id,answered_at,reviewed_at,captain_reply,
    profiles!form_requests_player_id_fkey(full_name),forms!form_requests_form_id_fkey(title),
    form_answers(id,value,photo_paths,form_questions(label_ar,label_en,position,options,alert_on))`, { count: 'exact' })
    .eq('captain_id', captain).not('answered_at', 'is', null).not('reviewed_at', 'is', null);
  const queries = [checks, videos, forms];
  const kinds = ['checkin', 'form', 'assessment'] as const;
  queries.forEach((query, index) => {
    query.lte('reviewed_at', parsed.at).order('reviewed_at', { ascending: false }).order('id').limit(51);
    const cursor = parsed.cursor;
    if (!cursor) query.gte('reviewed_at', weekAt);
    else {
      const comparison = (kinds[index] ?? '').localeCompare(cursor.kind) > 0 ? 'gte' : 'gt';
      query.or(`reviewed_at.lt.${cursor.at},and(reviewed_at.eq.${cursor.at},id.${comparison}.${cursor.id})`);
    }
  });
  const [checkRows, videoRows, formRows, older] = await Promise.all([checks, videos, forms,
    parsed.cursor ? Promise.resolve([]) : Promise.all((['check_ins', 'form_checks', 'form_requests'] as const).map(table =>
      client.from(table).select('id', { count: 'exact', head: true }).eq('captain_id', captain).lt('reviewed_at', weekAt))),
  ]);
  if (checkRows.error || videoRows.error || formRows.error || older.some(row => row.error)) throw new Error('followup-history');
  const base = (row: { id: string; player_id: string; reviewed_at: string | null; captain_reply: string | null;
    profiles: { full_name: string | null; timezone?: string | null } | null }) => ({ id: row.id, player_id: row.player_id,
    player_name: row.profiles?.full_name ?? '', reviewed_at: row.reviewed_at, reply: row.captain_reply,
    timezone: profileTimezone(row.profiles?.timezone) });
  const items = [
    ...checkRows.data.map(row => ({ ...base(row), kind: 'checkin' as const, created_at: row.created_at,
      week_start: row.week_start, body_weight_kg: row.body_weight_kg, waist_cm: row.waist_cm, notes: row.notes })),
    ...videoRows.data.map(row => ({ ...base(row), kind: 'form' as const, created_at: row.created_at,
      exercise_name: exerciseName(row.exercises ?? {}, locale), note: row.note })),
    ...formRows.data.flatMap(row => row.answered_at ? [{ ...base(row), kind: 'assessment' as const, created_at: row.answered_at,
      title: row.forms?.title ?? '', answers: [...row.form_answers].sort((a, b) => (a.form_questions?.position ?? 0) - (b.form_questions?.position ?? 0)).map(answer => ({
        id: answer.id, label_ar: answer.form_questions?.label_ar ?? '', label_en: answer.form_questions?.label_en ?? '',
        value: answer.value, photoCount: answer.photo_paths.length,
        alert: matchesAlert(z.object({ operator: z.enum(['eq', 'gt', 'lt']), value: z.union([z.string(), z.number(), z.boolean()]) }).nullable().parse(answer.form_questions?.alert_on ?? null), answer.value),
        options: z.array(z.object({ value: z.string(), label_ar: z.string(), label_en: z.string() })).parse(answer.form_questions?.options ?? []),
      })) }] : []),
  ].sort((a, b) => Date.parse(b.reviewed_at ?? '') - Date.parse(a.reviewed_at ?? '')
    || fraction(b.reviewed_at ?? '') - fraction(a.reviewed_at ?? '') || a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind)).slice(0, 50);
  const total = (checkRows.count ?? 0) + (videoRows.count ?? 0) + (formRows.count ?? 0);
  const last = items.at(-1);
  const more = total > items.length || older.some(row => (row.count ?? 0) > 0);
  const cursor = last?.reviewed_at ? { at: last.reviewed_at, id: last.id, kind: last.kind }
    : !parsed.cursor && more ? { at: weekAt, id: '00000000-0000-0000-0000-000000000000', kind: 'assessment' as const } : null;
  return { items, total, more, cursor, weekAt, counts: { all: total, checkin: checkRows.count ?? 0,
    form: videoRows.count ?? 0, assessment: formRows.count ?? 0, request: 0 } };
}
