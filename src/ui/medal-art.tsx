type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const emblems = {
  star: 'M60 44l4.6 10.4 11.4 1.1-8.6 7.6 2.5 11.2L60 68.6l-9.9 5.7 2.5-11.2-8.6-7.6 11.4-1.1Z',
  flame: 'M60 42c4 7 11 10 11 20a11 11 0 0 1-22 0c0-5 3-8 5-10 0 4 2 6 4 6 0-6 0-11 2-16Z',
  bolt: 'M63 42 50 62h9l-3 16 14-21h-9Z',
  crown: 'M46 70 44 50l9 7 7-11 7 11 9-7-2 20Z',
  calendar: 'M48 50h24v22H48ZM48 56h24M54 46v6M66 46v6',
};

export function MedalArt({ rank, emblem = 'star', size = 64, locked = false, label, id, paints }: {
  rank: Rank; emblem?: keyof typeof emblems; size?: number; locked?: boolean; label: string; id: string; paints?: Record<string, string>;
}) {
  const color = (key: string) => paints?.[key] ?? `var(--color-medal-${rank}-${key})`;
  const gradient = (key: string) => `url(#${id}${key})`;
  const shield = rank >= 3;
  const frame = shield ? 'M60 16 96 29v29c0 23-16 39-36 47C40 97 24 81 24 58V29Z' : 'M60 16 96 36v42L60 98 24 78V36Z';
  const inner = shield ? 'M60 25 87 35v23c0 18-12 30-27 37-15-7-27-19-27-37V35Z' : 'M60 25 88 40v32L60 88 32 72V40Z';
  const span = 6 + (rank - 2) * 3.2;
  const wing = `M30 48C${22-span} 40 ${10-span} 44 ${4-span*.6} 36C${8-span*.4} 58 ${18-span*.3} 70 34 72Z`;
  return <svg role="img" aria-label={label} data-medal-rank={rank} width={size} height={size} viewBox="0 0 120 120"
    className={`shrink-0 overflow-visible ${locked ? 'opacity-40 grayscale' : ''}`}>
    <defs>
      <linearGradient id={`${id}m`} x2="0" y2="1"><stop stopColor={color('a')} /><stop offset=".55" stopColor={color('b')} /><stop offset="1" stopColor={color('c')} /></linearGradient>
      <linearGradient id={`${id}i`} x2="0" y2="1"><stop stopColor={color('c')} /><stop offset="1" stopColor={paints?.bg ?? 'var(--color-bg)'} /></linearGradient>
      <linearGradient id={`${id}g`} x2="1" y2="1"><stop stopColor={color('gem')} /><stop offset="1" stopColor={color('gem2')} /></linearGradient>
    </defs>
    <ellipse cx="60" cy="110" rx={24+rank*3} ry="4" fill={paints?.bg ?? 'var(--color-bg-deep)'} opacity=".45" />
    {rank >= 2 && <><path d={wing} fill={gradient('m')} stroke={color('c')} /><path d={wing} transform="translate(120 0) scale(-1 1)" fill={gradient('m')} stroke={color('c')} /></>}
    {rank >= 5 && <path d="M44 20 50 6l6 10 4-12 4 12 6-10 6 14Z" fill={gradient('m')} stroke={color('c')} />}
    <path d={frame} fill={gradient('m')} stroke={color('c')} strokeWidth="1.2" />
    <path d={frame} fill="none" stroke={paints?.ink ?? 'var(--color-ink)'} opacity=".55" transform="translate(60 57) scale(.94) translate(-60 -57)" />
    <path d={inner} fill={gradient('i')} />
    <path d="M60 31 82 43v26L60 83 38 69V43Z" fill={gradient('g')} opacity=".22" />
    <path d={emblems[emblem]} fill={emblem === 'calendar' ? 'none' : gradient('g')}
      stroke={emblem === 'calendar' ? gradient('g') : color('gem2')} strokeWidth={emblem === 'calendar' ? 4 : 1} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M60 18 92 36" stroke={paints?.ink ?? 'var(--color-ink)'} opacity=".35" strokeWidth="1.6" strokeLinecap="round" />
  </svg>;
}
