'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { controlInputClassName } from './input-class-name';

export { controlInputClassName } from './input-class-name';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  numeric?: boolean;
  icon?: string;
  required?: boolean;
};

export function Input({
  label,
  hint,
  error,
  type = 'text',
  numeric = false,
  icon,
  required = false,
  id,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium tracking-[-0.004em] text-stone-700"
        >
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {icon ? (
          <span
            className="material-icons pointer-events-none absolute left-2.5 text-xl text-stone-400"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={type}
          className={controlInputClassName({
            numeric,
            hasError,
            hasIcon: Boolean(icon),
            className,
          })}
          {...rest}
        />
      </div>
      {error ? (
        <span className="text-xs text-danger-fg">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
