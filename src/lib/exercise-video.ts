export type VideoLabel = 'youtube' | 'shorts' | 'drive' | 'file' | 'instagram' | 'tiktok' | 'link';
export type ExerciseVideoSource = { kind: 'youtube' | 'drive' | 'file'; embedUrl: string; vertical: boolean; label: VideoLabel }
  | { kind: 'external'; url: string; label: VideoLabel };

export function parseExerciseVideo(value: string | null | undefined): ExerciseVideoSource | null {
  if (!value || value.trim().length > 500) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname;
  const parts = url.pathname.split('/');
  const youtube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host) && !url.port;
  if (youtube) {
    const vertical = parts[1] === 'shorts';
    const id = host.endsWith('youtu.be') ? parts[1] : url.pathname === '/watch' ? url.searchParams.get('v') :
      ['embed', 'shorts'].includes(parts[1] ?? '') ? parts[2] : null;
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}?mute=1&playsinline=1&rel=0&modestbranding=1`);
      const time = url.searchParams.get('start') ?? url.searchParams.get('t');
      const match = time?.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
      const seconds = time && /^\d+$/.test(time) ? Number(time) : match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : 0;
      if (Number.isSafeInteger(seconds) && seconds > 0) embed.searchParams.set('start', String(seconds));
      return { kind: 'youtube', embedUrl: embed.href, vertical, label: vertical ? 'shorts' : 'youtube' };
    }
  }
  if (host === 'drive.google.com' && !url.port) {
    const id = parts[1] === 'file' && parts[2] === 'd' ? parts[3] : url.pathname === '/open' ? url.searchParams.get('id') : null;
    if (id && /^[A-Za-z0-9_-]+$/.test(id)) return { kind: 'drive', embedUrl: `https://drive.google.com/file/d/${id}/preview`, vertical: false, label: 'drive' };
  }
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return { kind: 'file', embedUrl: url.href, vertical: false, label: 'file' };
  const label = /(^|\.)instagram\.com$/.test(host) ? 'instagram' : /(^|\.)tiktok\.com$/.test(host) ? 'tiktok' : 'link';
  return { kind: 'external', url: url.href, label };
}
