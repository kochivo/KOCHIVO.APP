export function HomeRing({ value, size = 44, tone = 'text-lime', label }: {
  value: number; size?: number; tone?: string; label?: string;
}) {
  return <svg width={size} height={size} viewBox="0 0 44 44" className={`shrink-0 ${tone}`}
    role={label ? 'progressbar' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined} aria-valuenow={label ? Math.round(value * 100) : undefined}>
    <circle cx="22" cy="22" r="18" fill="none" className="stroke-ink/10" strokeWidth="3" />
    {value > 0 && <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      pathLength="100" strokeDasharray={`${Math.max(0, Math.min(1, value)) * 100} 100`} transform="rotate(-90 22 22)" />}
  </svg>;
}
