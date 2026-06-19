'use client';

import type { InputHTMLAttributes } from 'react';
import { controlInputClassName } from './input-class-name';

export type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Largura fixa do campo compacto. @default '11rem' */
  widthClass?: string;
};

export function DateField({
  className = '',
  widthClass = 'w-[11rem]',
  ...rest
}: DateFieldProps) {
  return (
    <input
      type="date"
      className={controlInputClassName({
        fullWidth: false,
        className: `${widthClass} ${className}`.trim(),
      })}
      {...rest}
    />
  );
}
