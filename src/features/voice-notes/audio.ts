export const MAX_VOICE_SECONDS = 120;

export function audioMimeFromPath(path: string): string | undefined {
  const extension = path.split('.').at(-1)?.toLowerCase();
  return extension ? ({ webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg' } as Record<string, string>)[extension] : undefined;
}

// Safari records mp4, Chrome and Firefox record webm/ogg; the first supported one wins.
const recorderTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function pickRecorderType(isSupported: (type: string) => boolean): string | undefined {
  return recorderTypes.find((type) => isSupported(type));
}

/** Storage only accepts the bare mime type, so codec parameters are dropped before upload. */
export function bareAudioType(type: string): string {
  return type.split(';')[0]?.trim().toLowerCase() || 'audio/webm';
}

export function recordedSeconds(milliseconds: number): number {
  return Math.min(MAX_VOICE_SECONDS, Math.max(1, Math.round(milliseconds / 1000)));
}

export function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
