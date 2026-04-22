'use client';

import { useEffect, useState } from 'react';
import { formatIsoDateToDDMMYYYY, parseDateInputToIsoBR } from '@/lib/utils/date-utils';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  /** Não renderiza o bloco de label (ex.: label já está ao lado) */
  hideLabel?: boolean;
  className?: string;
}

export default function DateInput({
  value,
  onChange,
  required = false,
  disabled = false,
  label = 'Data',
  hideLabel = false,
  className = '',
}: DateInputProps) {
  const [text, setText] = useState(() => formatIsoDateToDDMMYYYY(value));

  useEffect(() => {
    setText(formatIsoDateToDDMMYYYY(value));
  }, [value]);

  const handleBlur = () => {
    const parsed = parseDateInputToIsoBR(text);
    if (parsed) {
      onChange(parsed);
      setText(formatIsoDateToDDMMYYYY(parsed));
      return;
    }
    if (!required && !text.trim()) {
      onChange('');
      setText('');
      return;
    }
    setText(formatIsoDateToDDMMYYYY(value));
  };

  return (
    <div className="w-full">
      {!hideLabel && (
        <label className="block text-base font-semibold text-gray-800 mb-3">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/AAAA"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        className={
          className ||
          'w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium bg-white text-gray-900'
        }
      />
    </div>
  );
}
