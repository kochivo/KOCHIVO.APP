export function FileRing({ value, max, label, calm = false }: { value: number; max: number; label: string; calm?: boolean }) {
  const progress = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <div className="relative size-[78px] shrink-0" role="img" aria-label={label}>
    <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5" className="text-line" />
      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
        pathLength="100" strokeDasharray={`${progress * 100} 100`} className={calm ? 'text-calm' : 'text-lime'} />
    </svg>
    <bdi className="absolute inset-0 grid place-items-center font-display text-sm font-bold">{label}</bdi>
  </div>;
}
