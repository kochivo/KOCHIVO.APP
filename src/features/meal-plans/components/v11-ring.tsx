export function V11Ring({ value, progress = 1, small = false }: { value: string; progress?: number; small?: boolean }) {
  return <div className={`relative shrink-0 ${small ? 'size-[72px]' : 'size-24'}`}>
    <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90 fill-none stroke-lime">
      <circle cx="50" cy="50" r="44" strokeWidth="6" className="stroke-line" />
      <circle cx="50" cy="50" r="44" strokeWidth="6" pathLength="1" strokeDasharray={`${progress} 1`} strokeLinecap="round" />
    </svg><b className="absolute inset-0 grid place-items-center font-display text-lg tabular-nums">{value}</b>
  </div>;
}
