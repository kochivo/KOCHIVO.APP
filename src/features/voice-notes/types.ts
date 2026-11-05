export interface VoiceContext {
  kind: 'form' | 'checkin';
  id: string;
}

export interface VoiceNote {
  id: string;
  url: string;
  durationSeconds: number;
  listenedAt: string | null;
  createdAt: string;
  contextId: string | null;
  mimeType?: string;
}
