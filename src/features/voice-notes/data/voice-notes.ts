'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uuidv7 } from '@/core/offline/ids';
import { uploadPrivateMedia } from '@/core/storage';
import type { AppDatabase } from '@/types/app-database';
import { audioMimeFromPath, bareAudioType } from '../audio';
import type { VoiceContext, VoiceNote } from '../types';
import { voiceNoteTooLarge } from '@/lib/upload-guards';

const BUCKET = 'voice-notes';
const fields = 'id,audio_path,duration_seconds,listened_at,created_at,context_kind,context_id';

type Row = { id: string; audio_path: string; duration_seconds: number; listened_at: string | null; created_at: string;
  context_kind: string | null; context_id: string | null };

export async function withUrls(client: SupabaseClient<AppDatabase>, rows: Row[]): Promise<VoiceNote[]> {
  if (!rows.length) return [];
  const signed = await client.storage.from(BUCKET).createSignedUrls(rows.map((row) => row.audio_path), 3600);
  if (signed.error || !signed.data || signed.data.length !== rows.length || signed.data.some(file => file.error || !file.signedUrl)) throw new Error('Signing voice notes failed');
  return rows.flatMap((row, index) => {
    const url = signed.data[index]?.signedUrl;
    return url ? [{ id: row.id, url, durationSeconds: row.duration_seconds, listenedAt: row.listened_at,
      createdAt: row.created_at, contextId: row.context_id, mimeType: audioMimeFromPath(row.audio_path) }] : [];
  });
}

export async function sendVoiceNote(client: SupabaseClient<AppDatabase>, input: {
  playerId: string; recording: Blob; seconds: number; context?: VoiceContext; previewUrl?: string;
}): Promise<VoiceNote> {
  if (voiceNoteTooLarge(input.recording.size)) throw new Error('Voice note exceeds 2 MB');
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Not signed in');
  const blob = new Blob([input.recording], { type: bareAudioType(input.recording.type) });
  const path = await uploadPrivateMedia(client, BUCKET, input.playerId, blob);
  const { data, error } = await client.from('voice_notes').insert({
    id: uuidv7(), captain_id: auth.data.user.id, player_id: input.playerId, audio_path: path,
    duration_seconds: input.seconds, context_kind: input.context?.kind ?? null, context_id: input.context?.id ?? null,
  }).select(fields).single();
  if (error || !data) {
    // Without its row the file is unreachable, so do not leave it behind.
    await client.storage.from(BUCKET).remove([path]);
    throw new Error('Saving the voice note failed');
  }
  // An attached reply already owns a preview; signing must not turn a saved upload into a retry.
  if (input.previewUrl) return { id: data.id, url: input.previewUrl, durationSeconds: data.duration_seconds,
    listenedAt: data.listened_at, createdAt: data.created_at, contextId: data.context_id, mimeType: audioMimeFromPath(path) };
  const [note] = await withUrls(client, [data]);
  if (!note) throw new Error('Signing the voice note failed');
  return note;
}

export async function listVoiceNotes(client: SupabaseClient<AppDatabase>, playerId: string): Promise<VoiceNote[]> {
  const { data, error } = await client.from('voice_notes').select(fields)
    .eq('player_id', playerId).order('created_at', { ascending: false }).limit(30);
  if (error || !data) throw new Error('Loading voice notes failed');
  return withUrls(client, data);
}

export async function markListened(client: SupabaseClient<AppDatabase>, id: string, now: Date) {
  const { error } = await client.from('voice_notes').update({ listened_at: now.toISOString() })
    .eq('id', id).is('listened_at', null);
  if (error) console.warn('Marking voice note listened failed', error.message);
}

export async function listContextVoiceNotes(client: SupabaseClient<AppDatabase>, kind: VoiceContext['kind'], ids: string[]): Promise<Record<string, VoiceNote[]>> {
  if (!ids.length) return {};
  const { data, error } = await client.from('voice_notes').select(fields)
    .eq('context_kind', kind).in('context_id', ids).order('created_at', { ascending: false });
  if (error || !data) throw new Error('Loading voice notes failed');
  const grouped: Record<string, VoiceNote[]> = {};
  for (const note of await withUrls(client, data)) {
    if (note.contextId) (grouped[note.contextId] ??= []).push(note);
  }
  return grouped;
}
