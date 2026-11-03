export function formVideoError(bytes: number, seconds: number): 'size' | 'duration' | 'metadata' | null {
  if (bytes > 50 * 1024 * 1024) return 'size';
  if (!Number.isFinite(seconds) || seconds <= 0) return 'metadata';
  return seconds > 60 ? 'duration' : null;
}

export function voiceNoteTooLarge(bytes: number): boolean {
  return bytes > 2 * 1024 * 1024;
}

export function shouldStopVoiceRecording(elapsedMilliseconds: number): boolean {
  return elapsedMilliseconds >= 120_000;
}
