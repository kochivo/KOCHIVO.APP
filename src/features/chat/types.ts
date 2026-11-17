import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export interface ChatMessage {
  id: string;
  playerId: string;
  captainId: string;
  senderId: string;
  body: string | null;
  audioPath: string | null;
  durationSeconds: number | null;
  readAt: string | null;
  createdAt: string;
  url?: string;
  urlExpiresAt?: number;
}

export interface ChatThreadItem extends ChatMessage {
  source: 'chat' | 'voice_note' | 'captain_reply';
  kind: 'text' | 'voice';
  mine: boolean;
  status: 'sending' | 'sent' | 'failed';
}

export interface TextInput {
  playerId: string;
  captainId: string;
  senderId: string;
  body: string;
  id?: string;
}
export interface VoiceInput extends Omit<TextInput, 'body'> {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}
export interface ChatTimer {
  start: (tick: () => void, intervalMs: number) => unknown;
  stop: (handle: unknown) => void;
}
export interface ChatThreadOptions {
  playerId: string;
  captainId: string;
  viewerId: string;
  now?: () => Date;
  intervalMs?: number;
  timer?: ChatTimer;
  client?: SupabaseClient<AppDatabase>;
}
