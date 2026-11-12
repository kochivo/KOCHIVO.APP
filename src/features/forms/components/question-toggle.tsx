export function QuestionToggle({ label, checked, onChange, disabled = false }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
    onClick={() => onChange(!checked)} className="flex min-h-12 w-full items-center gap-3 border-t border-line-soft py-3 text-start text-[13px] disabled:opacity-50">
    <span>{label}</span><span aria-hidden className={`relative ms-auto h-[22px] w-[38px] shrink-0 rounded-full ${checked ? 'bg-lime' : 'bg-surface'}`}>
      <span className={`absolute top-[3px] size-4 rounded-full ${checked ? 'end-[3px] bg-on-lime' : 'start-[3px] bg-faint'}`} />
    </span>
  </button>;
}
