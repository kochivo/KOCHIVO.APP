import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Keeps the label for screen readers only, for self-explanatory fields like OTP boxes. */
  hideLabel?: boolean;
}

export function TextField({ label, hint, error, id, className, hideLabel, 'aria-describedby': describedBy, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = [describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-inline text-start">
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'text-sm font-semibold'}>{label}</label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description || undefined}
        className={cn('min-h-12 min-w-0 w-full rounded-control glass recessed px-page-x text-base text-start text-ink placeholder:text-faint disabled:opacity-40', error && 'border-danger', className)}
      />
      {hint && <p id={`${fieldId}-hint`} className="text-sm text-faint">{hint}</p>}
      {error && <p role="alert" id={`${fieldId}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
