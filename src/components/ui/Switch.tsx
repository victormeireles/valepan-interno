'use client';

import { useId } from 'react';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  return (
    <label
      htmlFor={switchId}
      className={[
        'inline-flex min-h-11 items-center gap-2.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={[
          'relative h-[1.625rem] w-11 shrink-0 rounded-full border-none p-0',
          'transition-colors duration-[130ms] ease-out',
          checked ? 'bg-accent' : 'bg-stone-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-control',
            'transition-[left] duration-[130ms] ease-out',
            checked ? 'left-[21px]' : 'left-[3px]',
          ].join(' ')}
        />
      </button>
      {label ? (
        <span className="text-sm font-medium tracking-[-0.004em] text-stone-700">
          {label}
        </span>
      ) : null}
    </label>
  );
}
