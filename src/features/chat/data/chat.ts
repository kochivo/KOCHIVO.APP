'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uuidv7 } from '@/core/offline/ids';
import { voiceNoteTooLarge } from '@/lib/upload-guards';
import type { AppDatabase } from '@/types/app-database';
import type { ChatMessage, TextInput, VoiceInput } from '../types';

type Client = SupabaseClient<AppDatabase>;
type Row = AppDatabase['public']['Tables']['chat_messages']['Row'];
const fields = 'id,player_id,captain_id,sender_id,body,audio_path,duration_seconds,read_at,created_at';
const bucket = 'voice-notes';
const extensions: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };
function message(row: Row): ChatMessage {
  return { id: row.id, playerId: row.player_id, captainId: row.captain_id, senderId: row.sender_id,
    body: row.body, audioPath: row.audio_path, durationSeconds: row.duration_seconds, readAt: row.read_at, createdAt: row.created_at };
}

export async function listMessages(client: Client, input: { playerId: string; captainId: string; limit?: number }): Promise<ChatMessage[]> {
  const { data, error } = await client.from('chat_messages').select(fields).eq('player_id', input.playerId)
    .eq('captain_id', input.captainId).order('created_at', { ascending: false }).order('id', { ascending: false })
    .limit(input.limit ?? 50);
  if (error) throw error;
  const rows = (data ?? []).toReversed().map(message);
  const audio = rows.filter(row => row.audioPath);
  if (audio.length) {
    const signed = await client.storage.from(bucket).createSignedUrls(audio.map(row => row.audioPath ?? ''), 3600);
    if (signed.error || !signed.data || signed.data.length !== audio.length) throw signed.error ?? new Error('Signing chat audio failed');
    for (const [index, row] of audio.entries()) {
      const file = signed.data[index];
      if (file?.error || !file?.signedUrl) throw new Error('Signing chat audio failed');
      row.url = file.signedUrl;
    }
  }
  return rows;
}

async function insert(client: Client, row: AppDatabase['public']['Tables']['chat_messages']['Insert']): Promise<ChatMessage> {
  const { data, error } = await client.from('chat_messages').insert(row).select(fields).single();
  if (!error && data) return message(data);
  // A response can be lost after COMMIT. Retrying the same client id must not duplicate the message.
  if (error?.code === '23505') {
    const saved = await client.from('chat_messages').select(fields).eq('id', row.id).single();
    if (saved.data && saved.data.sender_id === row.sender_id && saved.data.player_id === row.player_id
      && saved.data.captain_id === row.captain_id && saved.data.body === (row.body ?? null)
      && saved.data.audio_path === (row.audio_path ?? null)) return message(saved.data);
  }
  throw error ?? new Error('Saving chat message failed');
}

export async function sendText(client: Client, input: TextInput): Promise<ChatMessage> {
  const body = input.body.trim();
  if (!body || [...body].length > 1000) throw new Error('Invalid chat text');
  return insert(client, { id: input.id ?? uuidv7(), captain_id: input.captainId,
    player_id: input.playerId, sender_id: input.senderId, body });
}

export async function sendVoice(client: Client, input: VoiceInput): Promise<ChatMessage> {
  const mimeType = input.mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  const ext = extensions[mimeType];
  if (!ext || voiceNoteTooLarge(input.blob.size) || !Number.isInteger(input.durationSeconds)
    || input.durationSeconds < 1 || input.durationSeconds > 120) throw new Error('Invalid chat recording');
  const id = input.id ?? uuidv7();
  const path = `${input.playerId}/chat/${id}.${ext}`;
  const storage = client.storage.from(bucket);
  const uploaded = await storage.upload(path, input.blob, { contentType: mimeType, upsert: false });
  if (uploaded.error && !('statusCode' in uploaded.error && String(uploaded.error.statusCode) === '409')) throw uploaded.error;
  try {
    return await insert(client, { id, captain_id: input.captainId, player_id: input.playerId,
      sender_id: input.senderId, audio_path: path, duration_seconds: input.durationSeconds });
  } catch (error) {
    await storage.remove([path]);
    throw error;
  }
}

export async function markRead(client: Client, ids: readonly string[], now = new Date()): Promise<void> {
  if (!ids.length) return;
  const { error } = await client.from('chat_messages').update({ read_at: now.toISOString() }).in('id', [...ids]).is('read_at', null);
  if (error) throw error;
}

export async function unreadCounts(client: Client, captainId: string): Promise<Record<string, number>> {
  const { data, error } = await client.from('chat_messages').select('player_id').eq('captain_id', captainId)
    .neq('sender_id', captainId).is('read_at', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.player_id] = (counts[row.player_id] ?? 0) + 1;
  return counts;
}
