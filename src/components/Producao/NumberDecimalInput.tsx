'use client';

import { useEffect, useState } from 'react';

interface NumberDecimalInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
  /** Tipografia e padding menores (etapas de produção compactas) */
  compact?: boolean;
}

function parsePtDecimal(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '');
  if (t === '') return null;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatDisplay(n: number, step?: number): string {
  const s = step != null && step < 1 ? String(n).replace('.', ',') : String(n);
  return s;
}

export default function NumberDecimalInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  required = false,
  disabled = false,
  className,
  hideLabel = false,
  compact = false,
}: NumberDecimalInputProps) {
  const [text, setText] = useState(() => formatDisplay(value, step));

  useEffect(() => {
    setText(formatDisplay(value, step));
  }, [value, step]);

  const applyFromText = () => {
    const parsed = parsePtDecimal(text);
    if (parsed === null) {
      setText(formatDisplay(value, step));
      return;
    }
    let next = parsed;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(next);
    setText(formatDisplay(next, step));
  };

  const inputClass =
    className ||
    (compact
      ? 'w-full min-h-[40px] rounded-lg border-2 border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white'
      : 'w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium bg-white text-gray-900');

  const labelClass = compact
    ? 'block text-sm font-semibold text-gray-900 mb-1.5 sm:text-base'
    : 'block text-base font-semibold text-gray-800 mb-3';

  return (
    <div className="w-full">
      {!hideLabel && (
        <label className={labelClass}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        required={required}
        onChange={(e) => setText(e.target.value)}
        onBlur={applyFromText}
        className={inputClass}
      />
    </div>
  );
}
