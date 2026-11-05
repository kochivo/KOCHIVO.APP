// A static sample keeps the interactive analytics feature out of the public bundle.
export function ReadinessMuscles() {
  return <svg aria-hidden="true" viewBox="0 0 240 200" className="glass-strong h-48 w-full rounded-card">
    {[65, 175].map((x, index) => <g key={x} transform={`translate(${x} 8)`}>
      <circle cx="0" cy="15" r="12" className="fill-muted" />
      <path d="M-16 34 Q0 27 16 34 L27 44 L36 96 Q33 105 27 98 L15 62 L12 100 L19 157 Q17 167 10 161 L0 119 L-10 161 Q-17 167 -19 157 L-12 100 L-15 62 L-27 98 Q-33 105 -36 96 L-27 44 Z" className="fill-surface-raised stroke-muted" />
      {index === 0
        ? <path d="M-14 38 Q0 32 14 38 L12 61 L2 58 L0 43 L-2 58 L-12 61 Z M-12 110 L-3 110 L-10 139 L-15 139 Z" className="fill-lime/80" />
        : <path d="M-13 38 L13 38 L11 71 L0 86 L-11 71 Z M4 108 L12 108 L15 137 L10 137 Z" className="fill-lime/50" />}
      {index === 1 && <circle cx="20" cy="39" r="5" className="fill-danger" />}
    </g>)}
    <rect x="20" y="184" width="200" height="7" rx="3.5" className="fill-muted/30" />
    <rect x="20" y="184" width="136" height="7" rx="3.5" className="fill-lime" />
  </svg>;
}
