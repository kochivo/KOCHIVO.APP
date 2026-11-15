import { useT } from '@/core/i18n/client';
import type { IntakeAnswers } from '../schemas';
import { messages } from '../intake/messages';

export function IntakeRadioGroup({ name, options, disabled }: {
  name: keyof IntakeAnswers; options: readonly IntakeAnswers[keyof IntakeAnswers][]; disabled: boolean;
}) {
  const t = useT(messages);
  return <div role="radiogroup" aria-labelledby={`${name}-label`} className="space-y-inline">
    <p id={`${name}-label`} className="font-bold">{t(name)}</p>
    <div className="grid gap-stack sm:grid-cols-3">{options.map(value =>
      <label key={value} className="glass flex min-h-12 cursor-pointer items-center gap-stack rounded-control p-card has-checked:ring-2 has-checked:ring-lime has-focus-visible:ring-2 has-focus-visible:ring-lime">
        <input type="radio" name={name} value={value} required disabled={disabled} className="size-5 accent-lime" />
        <span>{t(value)}</span>
      </label>)}</div>
  </div>;
}
