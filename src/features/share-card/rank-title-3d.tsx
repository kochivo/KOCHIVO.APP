import type { medalColors } from './medal-colors';

export function RankTitle3d({ title, metal, dir }: { title: string; metal: typeof medalColors[number]; dir: 'rtl' | 'ltr' }) {
  const fontSize = title.length > 12 ? 96 : title.length > 4 ? 195 : 250;
  const shadow = Array.from({ length: 8 }, (_, i) => `0 ${(i + 1) * 2}px 0 ${i < 3 ? metal.s3 : metal.ground}`).join(', ');
  return <div dir={dir} style={{ display: 'flex', position: 'relative', justifyContent: 'center',
    fontSize, lineHeight: 0.98, transform: 'skewX(-6deg)' }}>
    <div style={{ display: 'flex', color: metal.s3, textShadow: `${shadow}, 0 20px 40px ${metal.s1}80` }}>{title}</div>
    <div style={{ display: 'flex', position: 'absolute', top: 0,
      backgroundImage: `linear-gradient(${metal.white}, ${metal.s0} 20%, ${metal.s1} 45%, ${metal.s3} 55%, ${metal.s1} 75%, ${metal.s0})`,
      backgroundClip: 'text', color: 'transparent' }}>{title}</div>
  </div>;
}
