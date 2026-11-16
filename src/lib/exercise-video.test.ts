import { describe, expect, it } from 'vitest';
import { parseExerciseVideo } from './exercise-video';

describe('exercise video URLs', () => {
  it('enables state messages with the client origin', () => {
    const source = parseExerciseVideo('https://youtu.be/dQw4w9WgXcQ', 'https://kochivo.test');
    expect(source).toMatchObject({ embedUrl: expect.stringContaining('enablejsapi=1&origin=https%3A%2F%2Fkochivo.test') });
  });
  it.each([
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/embed/dQw4w9WgXcQ',
  ])('rebuilds a safe YouTube embed for %s', url => {
    expect(parseExerciseVideo(url)).toMatchObject({ kind: 'youtube', vertical: false,
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?mute=1&playsinline=1&rel=0&modestbranding=1' });
  });
  it('recognizes shorts and preserves timestamps', () => {
    expect(parseExerciseVideo('https://youtube.com/shorts/dQw4w9WgXcQ?t=1m12s')).toMatchObject({ vertical: true,
      embedUrl: expect.stringContaining('&start=72') });
    expect(parseExerciseVideo('https://youtu.be/dQw4w9WgXcQ?start=30')).toMatchObject({ embedUrl: expect.stringContaining('&start=30') });
  });
  it.each(['https://drive.google.com/file/d/abc_123/view', 'https://drive.google.com/open?id=abc_123'])('rebuilds Drive %s', url => {
    expect(parseExerciseVideo(url)).toMatchObject({ kind: 'drive', embedUrl: 'https://drive.google.com/file/d/abc_123/preview' });
  });
  it.each(['mp4', 'webm', 'mov'])('recognizes %s files with query strings', extension => {
    expect(parseExerciseVideo(`https://media.example/video.${extension}?token=123`)).toMatchObject({ kind: 'file' });
  });
  it.each(['https://instagram.com/reel/123', 'https://tiktok.com/123', 'https://facebook.com/123',
    'https://youtube.com/watch?v=bad', 'https://youtube.com.evil.test/embed/dQw4w9WgXcQ',
    'https://drive.google.com/file/d/%22evil/view'])('keeps unsupported URLs external: %s', url => {
    expect(parseExerciseVideo(url)).toMatchObject({ kind: 'external', url });
  });
  it.each(['http://youtu.be/dQw4w9WgXcQ', 'javascript:alert(1)', '', 'bad', 'https://user:password@example.com/a.mp4'])('rejects %s', url => {
    expect(parseExerciseVideo(url)).toBeNull();
  });
  it('never embeds an arbitrary origin', () => {
    for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://drive.google.com/open?id=abc_123']) {
      const parsed = parseExerciseVideo(url);
      expect(parsed && parsed.kind !== 'external' && new URL(parsed.embedUrl).origin)
        .toMatch(/^https:\/\/(www.youtube-nocookie.com|drive.google.com)$/);
    }
  });
});
