import { useId, useState } from 'react';

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  type?: 'text' | 'email' | 'password';
  error?: string | undefined;
  hint?: string | undefined;
}

/** Moves focus to the named field, so a screen reader announces its label and its error together. */
export function focusField(form: HTMLFormElement, name: string): void {
  const element = form.elements.namedItem(name);
  if (element instanceof HTMLElement) element.focus();
}

/**
 * A labelled input. The error replaces the hint rather than joining it, and is linked to the
 * input so it is read out with it. Text is 16px on a phone because iOS zooms into anything
 * smaller when it takes focus, and does not zoom back out.
 *
 * There is deliberately no way to disable it. A field that cannot be typed into looks broken,
 * and that is what an earlier version did to every form when a setting was missing.
 */
export function Field({
  label,
  name,
  value,
  onChange,
  autoComplete,
  type = 'text',
  error,
  hint,
}: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const note = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium tracking-widest text-muted uppercase">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={isPassword && shown ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize={type === 'email' ? 'none' : undefined}
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={note}
          className={`w-full rounded-md border bg-surface px-3 py-3 text-base outline-none focus:border-ink sm:text-sm ${
            error ? 'border-avoid' : 'border-line'
          } ${isPassword ? 'pr-16' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((current) => !current)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-4 text-xs text-muted hover:text-ink"
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-avoid">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
