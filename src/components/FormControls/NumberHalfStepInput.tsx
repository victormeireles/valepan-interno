'use client';

import { useState, useEffect } from 'react';
import { controlInputClassName } from '@/components/ui/Input';

const stepperBtnClass =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[9px] ' +
  'border border-border-default bg-surface text-xl font-medium text-stone-700 ' +
  'shadow-control transition-[background,box-shadow,transform] duration-[130ms] ' +
  'hover:bg-stone-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

interface NumberHalfStepInputProps {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberHalfStepInput({
  value,
  onChange,
  required = false,
  disabled = false,
  label,
  min = 0,
  max = 99999,
  step = 0.5,
}: NumberHalfStepInputProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value));
  }, [value]);

  const handleChange = (inputValue: string) => {
    setDisplayValue(inputValue);

    if (inputValue === '') {
      onChange(0);
      return;
    }

    if (inputValue.includes('1/2')) {
      const base = inputValue.replace(/\s*1\/2\s*$/, '').trim();
      const baseNum = parseFloat(base);
      if (!isNaN(baseNum)) {
        onChange(baseNum + 0.5);
        return;
      }
    }

    const num = parseFloat(inputValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
    setDisplayValue(formatDisplayValue(newValue));
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
    setDisplayValue(formatDisplayValue(newValue));
  };

  const formatDisplayValue = (val: number): string => {
    if (val === 0) {
      return '';
    }

    if (Number.isInteger(val)) {
      return val.toString();
    }

    const integerPart = Math.floor(val);
    const decimalPart = val - integerPart;

    if (Math.abs(decimalPart - 0.5) < 0.001) {
      return `${integerPart} 1/2`;
    }

    return val.toString();
  };

  const handleBlur = () => {
    setDisplayValue(formatDisplayValue(value));
  };

  return (
    <div className="w-full">
      <label className="mb-3 block text-sm font-medium tracking-[-0.004em] text-stone-700">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      <div className="flex max-w-full items-center space-x-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={stepperBtnClass}
        >
          −
        </button>

        <input
          type="text"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder="Ex: 3 ou 3 1/2"
          className={controlInputClassName({
            numeric: true,
            className: 'flex-1 min-w-[80px] text-center sm:min-w-[100px] md:min-w-[120px]',
          })}
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={stepperBtnClass}
        >
          +
        </button>
      </div>

      <p className="mt-2 text-sm font-medium text-text-muted">
        Use números inteiros ou inteiros + 1/2 (ex: 3, 3.5, 3 1/2)
      </p>
    </div>
  );
}
