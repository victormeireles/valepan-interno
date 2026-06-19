'use client';

import { useId, type SelectHTMLAttributes } from 'react';
import { controlInputClassName } from './Input';

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  required?: boolean;
};

export function Select({
  label,
  hint,
  error,
  options,
  required = false,
  id,
  children,
  className,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={selectId}
          className="text-sm font-medium tracking-[-0.004em] text-stone-700"
        >
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      <div className="relative flex items-center">
        <select
          id={selectId}
          className={controlInputClassName({
            hasError,
            className: `appearance-none pr-9 ${className ?? ''}`,
          })}
          {...rest}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <span
          className="material-icons pointer-events-none absolute right-2.5 text-xl text-text-muted"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
      {error ? (
        <span className="text-xs text-danger-fg">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
