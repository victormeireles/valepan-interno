'use client';

import { useState, useEffect } from 'react';
import { controlInputClassName } from '@/components/ui/Input';

const stepperBtnClass =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[9px] ' +
  'border border-border-default bg-surface text-xl font-medium text-stone-700 ' +
  'shadow-control transition-[background,box-shadow,transform] duration-[130ms] ' +
  'hover:bg-stone-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  label: string;
  min?: number;
  step?: number;
  max?: number;
}

export default function NumberInput({
  value,
  onChange,
  required = false,
  disabled = false,
  label,
  min = 0,
  step = 1,
  max = 99999,
}: NumberInputProps) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;

  const [displayValue, setDisplayValue] = useState<string>(
    safeValue === 0 ? '' : safeValue.toString(),
  );

  useEffect(() => {
    if (safeValue === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(safeValue.toString());
    }
  }, [safeValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    if (inputValue === '') {
      onChange(0);
    } else {
      const numValue = parseInt(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    if (displayValue === '') {
      onChange(0);
      setDisplayValue('');
    } else {
      const numValue = parseInt(displayValue);
      if (isNaN(numValue)) {
        setDisplayValue('');
        onChange(0);
      } else {
        setDisplayValue(numValue.toString());
      }
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(safeValue + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(safeValue - step, min);
    onChange(newValue);
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
          disabled={disabled || safeValue <= min}
          className={stepperBtnClass}
        >
          −
        </button>

        <input
          type="number"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          min={min}
          step={step}
          max={max}
          className={controlInputClassName({
            numeric: true,
            className: 'flex-1 min-w-[80px] text-center sm:min-w-[100px] md:min-w-[120px]',
          })}
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || safeValue >= max}
          className={stepperBtnClass}
        >
          +
        </button>
      </div>
    </div>
  );
}
