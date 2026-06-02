'use client';

import {
  FORM_FIELD_LABEL,
  INPUT_COMPACT_LINE,
} from '@/components/Producao/production-step-form-classes';

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** `modal` usa borda mais larga (fila); `compact` alinha às telas de etapa. */
  variant?: 'modal' | 'compact';
};

export default function SaidaFornoCarrinhoField({
  id,
  value,
  onChange,
  disabled = false,
  variant = 'compact',
}: Props) {
  const inputClass =
    variant === 'modal'
      ? 'w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900'
      : INPUT_COMPACT_LINE;

  return (
    <div className="space-y-1">
      <label className={FORM_FIELD_LABEL} htmlFor={id}>
        Número do carrinho
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder="ex.: 12"
      />
    </div>
  );
}
