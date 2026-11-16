import { hexagon, laurel, rays, sparkle, star, ticks, wings } from './medal-art-parts';

type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const emblems = {
  star: 'M60 44l4.6 10.4 11.4 1.1-8.6 7.6 2.5 11.2L60 68.6l-9.9 5.7 2.5-11.2-8.6-7.6 11.4-1.1Z',
  flame: 'M60 42c4 7 11 10 11 20a11 11 0 0 1-22 0c0-5 3-8 5-10 0 4 2 6 4 6 0-6 0-11 2-16Z',
  bolt: 'M63 42 50 62h9l-3 16 14-21h-9Z',
  crown: 'M46 70 44 50l9 7 7-11 7 11 9-7-2 20Z',
  calendar: 'M48 50h24v22H48ZM48 56h24M54 46v6M66 46v6',
};

export function MedalArt({ rank, emblem, size = 64, locked = false, label, id, paints, shine = false }: {
  rank: Rank; emblem?: keyof typeof emblems; size?: number; locked?: boolean; label: string; id: string;
  paints?: Record<string, string>; shine?: boolean;
}) {
  const color = (key: string) => paints?.[key] ?? `var(--color-medal-${rank}-${key})`;
  const shared = (key: string) => paints?.[key] ?? `var(--color-medal-${key})`;
  const s = (i: number) => locked ? shared(`locked-s${i}`) : color(`s${i}`);
  const gradient = (key: string) => `url(#${id}${key})`;
  const m = gradient('m'), v = gradient('v'), gem = gradient('gem');
  const dark = locked ? shared('locked-dark') : s(3), hi = locked ? shared('locked-hi') : s(0);
  const white = shared('white'), radius = 26 + rank * 1.3;
  const sheen = shine && !locked && !paints;
  return <svg role="img" aria-label={label} data-medal-rank={rank} width={size} height={size}
    style={paints ? { width: size, height: size, flexShrink: 0 } : undefined}
    viewBox={paints && size === 640 ? (rank < 3 ? '24 26 72 72' : '-10 -6 140 136') : '-10 -6 140 136'} className="shrink-0 overflow-visible">
    <defs>
      <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
        {[0, .22, .48, .62, .82, 1].map((offset, i) => <stop key={i} offset={offset} stopColor={s(i)} />)}
      </linearGradient>
      <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={s(1)} /><stop offset=".55" stopColor={s(2)} /><stop offset="1" stopColor={s(3)} />
      </linearGradient>
      <radialGradient id={`${id}r`} cx=".5" cy=".38" r=".7">
        <stop offset="0" stopColor={s(2)} stopOpacity=".55" /><stop offset=".6" stopColor={shared('disc')} />
        <stop offset="1" stopColor={shared('disc-edge')} />
      </radialGradient>
      <linearGradient id={`${id}gem`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={white} /><stop offset=".35" stopColor={locked ? s(1) : rank === 6 ? color('gem') : s(1)} />
        <stop offset="1" stopColor={locked ? shared('locked-gem') : s(3)} />
      </linearGradient>
      <radialGradient id={`${id}aura`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor={s(2)} stopOpacity=".55" /><stop offset="1" stopColor={s(2)} stopOpacity="0" />
      </radialGradient>
      {sheen && <>
        <linearGradient id={`${id}sh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={white} stopOpacity="0" /><stop offset=".5" stopColor={white} stopOpacity=".55" />
          <stop offset="1" stopColor={white} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}clip`}><circle cx="60" cy="62" r="30" /></clipPath>
      </>}
    </defs>
    <ellipse cx="60" cy={62 + radius + 22} rx={radius + 6} ry="3.5" fill={shared('ground')} opacity=".55" />
    {rank >= 5 && !locked && <circle data-part="aura" cx="60" cy="62" r={radius + 30} fill={gradient('aura')} />}
    {rank >= 3 && <g data-part="rays" fill={v} opacity={rank >= 6 ? .95 : .75}>
      {rays(radius).map((d, i) => <path key={i} d={d} />)}
    </g>}
    {rank >= 4 && <g data-part="wings" fill={m} stroke={dark} strokeWidth=".7">
      {wings(radius).map((d, i) => <path key={i} d={d} />)}
    </g>}
    {rank >= 3 && <g data-part="laurel" fill={m} stroke={dark} strokeWidth=".5">
      {laurel(radius).map((leaf, i) => <ellipse key={i} {...leaf} rx="2.6" ry="6.4" />)}
    </g>}
    {rank === 0 ? <>
      <path d={hexagon(radius + 2)} fill={m} stroke={dark} strokeWidth="1" />
      <circle cx="60" cy="62" r={radius - 8} fill={gradient('r')} stroke={hi} strokeOpacity=".5" />
    </> : <>
      <circle cx="60" cy="62" r={radius + 1.5} fill={dark} /><circle cx="60" cy="62" r={radius} fill={m} />
      {rank >= 2 && <g data-part="ticks" stroke={dark} strokeWidth=".8" opacity=".55">
        {ticks(radius).map((tick, i) => <line key={i} {...tick} />)}
      </g>}
      <circle cx="60" cy="62" r={radius - 6} fill={gradient('r')} stroke={hi} strokeOpacity=".6" strokeWidth=".8" />
    </>}
    {emblem ? <path data-emblem={emblem} d={emblems[emblem]} transform="translate(60 62) scale(.85) translate(-60 -60)"
      fill={emblem === 'calendar' ? 'none' : gem} stroke={emblem === 'calendar' ? gem : hi}
      strokeWidth={emblem === 'calendar' ? 4 : 1} strokeLinecap="round" strokeLinejoin="round" /> : <g data-part="rank-motif">
      {rank === 0 && <rect x="52" y="59" width="16" height="6" rx="2" fill={m} />}
      {rank === 1 && <path d="M48 58 L60 68 L72 58 L72 64 L60 74 L48 64Z" fill={m} stroke={dark} strokeWidth=".6" />}
      {(rank === 2 || rank === 3) && <>
        <path d={star(13 + rank, 5.6 + rank * .6)} fill={m} stroke={dark} strokeWidth=".6" />
        <path d={star(6, 2.6)} fill={hi} opacity=".55" />
      </>}
      {rank === 4 && <>
        <circle cx="60" cy="62" r="11" fill={gem} stroke={hi} strokeWidth=".8" />
        <path d="M53 58 L60 53 L67 58 L60 71Z" fill={white} opacity=".35" />
        <path d="M49 62 L60 53 L71 62" fill="none" stroke={white} opacity=".4" strokeWidth=".6" />
      </>}
      {rank >= 5 && <>
        <path d="M47 57 L53 50 L67 50 L73 57 L60 76Z" fill={gem} stroke={hi} strokeWidth=".8" />
        <path d="M47 57 L73 57 M53 50 L57 57 L60 76 M67 50 L63 57 L60 76 M57 57 L60 50 L63 57"
          fill="none" stroke={white} strokeOpacity=".55" strokeWidth=".6" />
        <path d="M53 50 L57 57 L47 57Z" fill={white} opacity=".35" />
      </>}
    </g>}
    {rank === 5 && <g data-part="tiara">
      <path d={`M46 ${61 - radius} L50 ${52 - radius} L56 ${58 - radius} L60 ${48 - radius} L64 ${58 - radius} L70 ${52 - radius} L74 ${61 - radius}Z`}
        fill={m} stroke={dark} strokeWidth=".6" />
      <circle cx="60" cy={48 - radius} r="2" fill={gem} />
    </g>}
    {rank === 6 && <g data-part="crown">
      <path d={`M38 ${64 - radius} L36 ${44 - radius} L47 ${54 - radius} L53 ${38 - radius} L60 ${52 - radius} L67 ${38 - radius} L73 ${54 - radius} L84 ${44 - radius} L82 ${64 - radius}Z`}
        fill={m} stroke={dark} strokeWidth=".8" />
      <rect x="38" y={60 - radius} width="44" height="5" rx="2" fill={v} />
      {[36, 53, 67, 84].map(x => <circle key={x} cx={x} cy={62 - radius - (x === 36 || x === 84 ? 18 : 24)} r="2.4" fill={gem} />)}
      <circle cx="60" cy={50 - radius} r="3.2" fill={gem} stroke={hi} strokeWidth=".5" />
    </g>}
    {sheen && <g data-part="shine" clipPath={gradient('clip')}>
      <style>{`@keyframes medal-shine { 0%, 60% { transform: translateX(-90px); } 100% { transform: translateX(110px); } }
        @media (prefers-reduced-motion: reduce) { .medal-shine { animation: none; opacity: 0; } }`}</style>
      <g transform="skewX(-18)"><rect className="medal-shine" x="30" y="20" width="22" height="90" fill={gradient('sh')} /></g>
    </g>}
    {locked && <g data-part="lock" transform="translate(60 63)">
      <rect x="-7" y="-2" width="14" height="11" rx="2.5" fill={shared('locked-lock')} />
      <path d="M-4.5 -2 V-5 a4.5 4.5 0 0 1 9 0 V-2" fill="none" stroke={shared('locked-lock')} strokeWidth="2" />
    </g>}
    {!locked && rank >= 4 && <g data-part="sparkles" fill={white}>
      <path d={sparkle(60 + radius + 8, 66 - radius, 4 + rank * .4)} />
      <path d={sparkle(56 - radius, 54 + radius, 2.6 + rank * .3)} />
      {rank >= 6 && <path d={sparkle(66, 32 - radius, 3.5)} />}
    </g>}
  </svg>;
}
