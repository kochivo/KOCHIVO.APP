import { describe, expect, it, vi } from 'vitest';
import { bareAudioType, clock, MAX_VOICE_SECONDS, pickRecorderType, recordedSeconds } from './audio';

vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '01900000-0000-7000-8000-000000000001' }));
const { sendVoiceNote, markListened } = await import('./data/voice-notes');

function fakeClient(insertError: unknown = null) {
  const upload = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const insert = vi.fn(() => ({ select: () => ({ single: async () => insertError ? { data: null, error: insertError } : {
    data: { id: 'n1', audio_path: 'p1/x.webm', duration_seconds: 12, listened_at: null, created_at: '2026-11-03T10:00:00Z', context_kind: null, context_id: null },
    error: null } }) }));
  const is = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: () => ({ is }) }));
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'c1' } }, error: null }) },
    storage: { from: () => ({ upload, remove, createSignedUrls: async (paths: string[]) => ({ data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })), error: null }) }) },
    from: () => ({ insert, update }),
  };
  return { client: client as never, upload, remove, insert, update, is };
}

describe('voice note audio', () => {
  it('picks the first recorder format the browser supports', () => {
    expect(pickRecorderType((type) => type === 'audio/mp4')).toBe('audio/mp4');
    expect(pickRecorderType(() => false)).toBeUndefined();
  });
  it('strips codec parameters so storage accepts the type', () => {
    expect(bareAudioType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(bareAudioType('')).toBe('audio/webm');
  });
  it('rounds recordings into the allowed length', () => {
    expect(recordedSeconds(200)).toBe(1);
    expect(recordedSeconds(12_400)).toBe(12);
    expect(recordedSeconds(500_000)).toBe(MAX_VOICE_SECONDS);
    expect(clock(75)).toBe('1:15');
  });
});

describe('sending voice notes', () => {
  it('uploads into the player folder and records the note with its context', async () => {
    const fake = fakeClient();
    const note = await sendVoiceNote(fake.client, { playerId: 'p1', recording: new Blob(['a'], { type: 'audio/webm;codecs=opus' }), seconds: 12,
      context: { kind: 'checkin', id: 'k1' } });
    expect(fake.upload).toHaveBeenCalledWith(expect.stringMatching(/^p1\/.+\.webm$/), expect.any(Blob), { contentType: 'audio/webm', upsert: false });
    expect(fake.insert).toHaveBeenCalledWith(expect.objectContaining({ captain_id: 'c1', player_id: 'p1', duration_seconds: 12, context_kind: 'checkin', context_id: 'k1' }));
    expect(note).toMatchObject({ id: 'n1', url: 'https://signed/p1/x.webm', durationSeconds: 12 });
  });
  it('removes the uploaded file when the row is rejected', async () => {
    const fake = fakeClient({ message: 'denied' });
    await expect(sendVoiceNote(fake.client, { playerId: 'p1', recording: new Blob(['a'], { type: 'audio/mp4' }), seconds: 5 })).rejects.toThrow();
    expect(fake.remove).toHaveBeenCalledWith([expect.stringMatching(/^p1\/.+\.m4a$/)]);
  });
  it('marks a note heard only once', async () => {
    const fake = fakeClient();
    await markListened(fake.client, 'n1', new Date('2026-11-03T10:00:00Z'));
    expect(fake.update).toHaveBeenCalledWith({ listened_at: '2026-11-03T10:00:00.000Z' });
    expect(fake.is).toHaveBeenCalledWith('listened_at', null);
  });
});
