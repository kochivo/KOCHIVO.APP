import { describe, expect, it } from 'vitest';
import { formVideoError, voiceNoteTooLarge, shouldStopVoiceRecording } from './upload-guards';

describe('upload guards', () => {
  it('allows video limits and rejects oversized or long videos', () => {
    expect(formVideoError(50 * 1024 * 1024, 60)).toBe(null);
    expect(formVideoError(50 * 1024 * 1024 + 1, 10)).toBe('size');
    expect(formVideoError(100, 60.01)).toBe('duration');
    for (const duration of [NaN, Infinity, -1, 0]) expect(formVideoError(100, duration)).toBe('metadata');
  });
  it('rejects voice blobs above 2 MB', () => {
    expect(voiceNoteTooLarge(2097152)).toBe(false);
    expect(voiceNoteTooLarge(2097153)).toBe(true);
  });
  it('stops recording at two minutes of elapsed time', () => {
    expect(shouldStopVoiceRecording(119999)).toBe(false);
    expect(shouldStopVoiceRecording(120000)).toBe(true);
    expect(shouldStopVoiceRecording(121000)).toBe(true);
  });
});
