import type { RankTier } from './rank-badge';

export function RankBadgeShapes({ tier, id, outline = false }: {
  tier: RankTier; id: string; outline?: boolean;
}) {
  const paint = (name: string) => `url(#${id}-${name})`;
  switch (tier) {
    case 'beginner':
      if (outline) return <><path d="M41.6 17.7 L78.4 17.7 L104.3 43.6 L104.3 80.4 L78.4 106.3 L41.6 106.3 L15.7 80.4 L15.7 43.6 Z" fill={paint('gBr')} />
        </>;
      return <>
        <path d="M41.6 17.7 L78.4 17.7 L104.3 43.6 L104.3 80.4 L78.4 106.3 L41.6 106.3 L15.7 80.4 L15.7 43.6 Z" fill={paint('gBr')} />
        <path d="M45.5 26.9 L74.5 26.9 L95.1 47.5 L95.1 76.5 L74.5 97.1 L45.5 97.1 L24.9 76.5 L24.9 47.5 Z" fill={paint('fBr')} stroke="var(--color-bronze-1)" strokeOpacity=".35" />
        <path d="M42 58 L60 71 L78 58" fill="none" stroke={paint('gBr')} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </>;
    case 'champion':
      if (outline) return <><path d="M60 8 L102 22 V60 C102 90 84 110 60 120 C36 110 18 90 18 60 V22 Z" fill={paint('gSi')} />
        </>;
      return <>
        <path d="M60 8 L102 22 V60 C102 90 84 110 60 120 C36 110 18 90 18 60 V22 Z" fill={paint('gSi')} />
        <path d="M60 18 L92 29 V60 C92 84 78 100 60 109 C42 100 28 84 28 60 V29 Z" fill={paint('fSi')} stroke="var(--color-silver-1)" strokeOpacity=".3" />
        <path d="M42 48 L60 61 L78 48 M42 68 L60 81 L78 68" fill="none" stroke={paint('gSi')} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </>;
    case 'elite':
      if (outline) return <><path d="M22 34 L0 26 L8 40 L0 48 L10 54 L4 64 L22 62 Z M98 34 L120 26 L112 40 L120 48 L110 54 L116 64 L98 62 Z" fill={paint('gGo')} />
        <path d="M60 8 L102 22 V60 C102 90 84 110 60 120 C36 110 18 90 18 60 V22 Z" fill={paint('gGo')} />
        </>;
      return <>
        <path d="M22 34 L0 26 L8 40 L0 48 L10 54 L4 64 L22 62 Z M98 34 L120 26 L112 40 L120 48 L110 54 L116 64 L98 62 Z" fill={paint('gGo')} />
        <path d="M60 8 L102 22 V60 C102 90 84 110 60 120 C36 110 18 90 18 60 V22 Z" fill={paint('gGo')} />
        <path d="M60 18 L92 29 V60 C92 84 78 100 60 109 C42 100 28 84 28 60 V29 Z" fill={paint('fGo')} stroke="var(--color-gold-1)" strokeOpacity=".35" />
        <path d="M60 44 L64.5 55.9 L77.1 56.4 L67.2 64.3 L70.6 76.6 L60 69.6 L49.4 76.6 L52.8 64.3 L42.9 56.4 L55.5 55.9 Z" fill={paint('gGo')} />
        <path d="M44 88 L60 96 L76 88" fill="none" stroke={paint('gGo')} strokeWidth="4" strokeLinecap="round" />
      </>;
    case 'legend':
      if (outline) return <><circle cx="60" cy="64" r="46" fill={paint('gPl')} />
        <ellipse cx="40" cy="98.6" rx="3.2" ry="7" transform="rotate(120 40 98.6)" />
        <ellipse cx="27.2" cy="87" rx="3.2" ry="7" transform="rotate(145 27.2 87)" />
        <ellipse cx="20.6" cy="71" rx="3.2" ry="7" transform="rotate(170 20.6 71)" />
        <ellipse cx="21.4" cy="54" rx="3.2" ry="7" transform="rotate(195 21.4 54)" />
        <ellipse cx="29.4" cy="38" rx="3.2" ry="7" transform="rotate(220 29.4 38)" />
        <ellipse cx="80" cy="98.6" rx="3.2" ry="7" transform="rotate(60 80 98.6)" />
        <ellipse cx="92.8" cy="87" rx="3.2" ry="7" transform="rotate(35 92.8 87)" />
        <ellipse cx="99.4" cy="71" rx="3.2" ry="7" transform="rotate(10 99.4 71)" />
        <ellipse cx="98.6" cy="54" rx="3.2" ry="7" transform="rotate(-15 98.6 54)" />
        <ellipse cx="90.6" cy="38" rx="3.2" ry="7" transform="rotate(-40 90.6 38)" />
        </>;
      return <>
        <circle cx="60" cy="64" r="46" fill={paint('gPl')} />
        <circle cx="60" cy="64" r="41" fill={paint('fOb')} />
        <g fill={paint('gGo')}>
        <ellipse cx="40" cy="98.6" rx="3.2" ry="7" transform="rotate(120 40 98.6)" />
        <ellipse cx="27.2" cy="87" rx="3.2" ry="7" transform="rotate(145 27.2 87)" />
        <ellipse cx="20.6" cy="71" rx="3.2" ry="7" transform="rotate(170 20.6 71)" />
        <ellipse cx="21.4" cy="54" rx="3.2" ry="7" transform="rotate(195 21.4 54)" />
        <ellipse cx="29.4" cy="38" rx="3.2" ry="7" transform="rotate(220 29.4 38)" />
        <ellipse cx="80" cy="98.6" rx="3.2" ry="7" transform="rotate(60 80 98.6)" />
        <ellipse cx="92.8" cy="87" rx="3.2" ry="7" transform="rotate(35 92.8 87)" />
        <ellipse cx="99.4" cy="71" rx="3.2" ry="7" transform="rotate(10 99.4 71)" />
        <ellipse cx="98.6" cy="54" rx="3.2" ry="7" transform="rotate(-15 98.6 54)" />
        <ellipse cx="90.6" cy="38" rx="3.2" ry="7" transform="rotate(-40 90.6 38)" />
        </g>
        <path d="M60 46 L64.5 57.9 L77.1 58.4 L67.2 66.3 L70.6 78.6 L60 71.6 L49.4 78.6 L52.8 66.3 L42.9 58.4 L55.5 57.9 Z" fill={paint('gPl')} />
      </>;
    case 'crown':
      if (outline) return <><path d="M60 4 L104 30 L104 92 L60 122 L16 92 L16 30 Z" fill={paint('gGo')} />
        </>;
      return <>
        <path d="M60 4 L104 30 L104 92 L60 122 L16 92 L16 30 Z" fill={paint('gGo')} />
        <path d="M60 13 L96 35 L96 87 L60 112 L24 87 L24 35 Z" fill={paint('fCr')} stroke="var(--color-crown-gem-2)" strokeOpacity=".5" />
        <path d="M35 80 L31 48 L47 62 L60 38 L73 62 L89 48 L85 80 Z" fill={paint('gGo')} />
        <rect x="35" y="83" width="50" height="8" rx="2" fill={paint('gGo')} />
        <path d="M60 60 L67 70 L60 80 L53 70 Z" fill={paint('gLi')} />
        <circle cx="31" cy="48" r="3.5" fill={paint('gLi')} />
        <circle cx="89" cy="48" r="3.5" fill={paint('gLi')} />
        <circle cx="60" cy="38" r="4" fill={paint('gLi')} />
      </>;
  }
}

