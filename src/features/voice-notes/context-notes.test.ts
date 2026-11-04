import { expect, it, vi } from 'vitest';
import { listContextVoiceNotes, withUrls } from './data/voice-notes';
import { audioMimeFromPath } from './audio';

function fake() {
  const rows = ['a', 'b', 'a'].map((context_id, i) => ({ id: `n${i}`, audio_path: `p/${i}.webm`,
    duration_seconds: 12, listened_at: null, created_at: '2026-11-04T12:00:00Z', context_kind: 'checkin', context_id }));
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.in.mockReturnValue(query);
  const sign = vi.fn(async (paths: string[]) => ({ data: paths.map(path => ({ signedUrl: `https://signed/${path}` })), error: null }));
  const from = vi.fn(() => query);
  return { rows, query, sign, from, client: { from, storage: { from: () => ({ createSignedUrls: sign }) } } as never };
}

it('loads all check-in notes with one context query and signs them together', async () => {
  const f = fake();
  const grouped = await listContextVoiceNotes(f.client, 'checkin', ['a', 'b']);
  expect(f.from).toHaveBeenCalledTimes(1);
  expect(f.query.eq).toHaveBeenCalledWith('context_kind', 'checkin');
  expect(f.query.in).toHaveBeenCalledWith('context_id', ['a', 'b']);
  expect(f.sign).toHaveBeenCalledTimes(1);
  expect(grouped.a?.map(note => note.id)).toEqual(['n0', 'n2']);
  expect(grouped.b?.map(note => note.id)).toEqual(['n1']);
  expect(grouped.a?.[0]?.mimeType).toBe('audio/webm');
});

it('skips the query for empty history', async () => {
  const f = fake();
  expect(await listContextVoiceNotes(f.client, 'checkin', [])).toEqual({});
  expect(f.from).not.toHaveBeenCalled();
});

it('reports partial signing failure instead of hiding a note', async () => {
  const f = fake();
  f.sign.mockResolvedValue({ data: [], error: null });
  await expect(withUrls(f.client, f.rows)).rejects.toThrow();
});

it.each([['p/a.webm', 'audio/webm'], ['p/a.m4a', 'audio/mp4'], ['p/a.ogg', 'audio/ogg'], ['p/a.mp3', 'audio/mpeg']])('derives %s MIME from its stored extension', (path, mime) => {
  expect(audioMimeFromPath(path)).toBe(mime);
});
