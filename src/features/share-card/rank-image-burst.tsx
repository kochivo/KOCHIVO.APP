import type { medalColors } from './medal-colors';

function random(index: number) {
  let seed = 321;
  for (let i = 0; i <= index; i++) seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

export function RankImageBurst({ metal }: { metal: typeof medalColors[number] }) {
  const particles = Array.from({ length: 26 }, (_, i) => ({ x: random(i * 3) * 1080, y: 220 + random(i * 3 + 1) * 1000, r: 2 + random(i * 3 + 2) * 5 }));
  const shards = Array.from({ length: 10 }, (_, i) => ({ x: random(78 + i * 4) * 1080, y: 250 + random(79 + i * 4) * 900, r: random(80 + i * 4) * 360, size: 30 + random(81 + i * 4) * 70 }));
  return <svg id="rank-burst" width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', top: 0 }}>
    <defs>
      <linearGradient id="burst-ray" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={metal.s1} stopOpacity=".3" /><stop offset="1" stopColor={metal.s1} stopOpacity="0" />
      </linearGradient>
      <linearGradient id="burst-white" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={metal.white} stopOpacity=".16" /><stop offset="1" stopColor={metal.white} stopOpacity="0" />
      </linearGradient>
      <radialGradient id="burst-particle">
        <stop stopColor={metal.s0} stopOpacity=".8" /><stop offset="1" stopColor={metal.s0} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="burst-shard" x2="1" y2="1">
        <stop stopColor={metal.white} stopOpacity=".55" /><stop offset=".4" stopColor={metal.s1} stopOpacity=".25" />
        <stop offset="1" stopColor={metal.white} stopOpacity=".04" />
      </linearGradient>
      <linearGradient id="burst-flare">
        <stop stopColor={metal.s0} stopOpacity="0" /><stop offset=".45" stopColor={metal.s0} />
        <stop offset=".5" stopColor={metal.white} /><stop offset=".55" stopColor={metal.s0} />
        <stop offset="1" stopColor={metal.s0} stopOpacity="0" />
      </linearGradient>
    </defs>
    {Array.from({ length: 90 }, (_, i) => <path key={i} d="M539 970 L541 970 L543 1990 L537 1990 Z"
      transform={`rotate(${i * 4} 540 690)`} fill={`url(#burst-${i % 2 ? 'white' : 'ray'})`} />)}
    {[560, 760, 980].map((diameter, i) => <ellipse key={diameter} cx="540" cy="690" rx={diameter / 2}
      ry={diameter * .45} fill="none" stroke={metal.s1} strokeWidth={8 - i * 2} opacity={.55 - i * .17} />)}
    {particles.map((p, i) => <g key={i}>
      <circle cx={p.x} cy={p.y} r={p.r * 4} fill="url(#burst-particle)" />
      <circle cx={p.x} cy={p.y} r={p.r} fill={metal.s0} opacity=".9" />
    </g>)}
    {shards.map((s, i) => <path key={i} d={`M0 0 L${s.size} ${s.size * .3} L${s.size * .2} ${s.size * 1.6} Z`}
      transform={`translate(${s.x} ${s.y}) rotate(${s.r})`} fill="url(#burst-shard)" stroke={metal.white} strokeOpacity=".35" />)}
    <rect x="-260" y="683" width="1600" height="14" transform="rotate(-8 540 690)" fill="url(#burst-flare)" opacity=".9" />
  </svg>;
}
