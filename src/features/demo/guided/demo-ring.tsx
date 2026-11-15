export function DemoRing({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="relative grid size-24 shrink-0 place-items-center">
    <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <circle cx="50" cy="50" r="42" fill="none" className="stroke-line" strokeWidth="7" />
      <circle cx="50" cy="50" r="42" fill="none" className="stroke-lime" strokeWidth="7" pathLength="100" strokeDasharray={`${Math.min(100, value / max * 100)} 100`} strokeLinecap="round" />
    </svg><span className="text-center"><b className="block text-h tabular-nums">{value}</b><small className="text-micro text-muted">{label}</small></span>
  </div>;
}
