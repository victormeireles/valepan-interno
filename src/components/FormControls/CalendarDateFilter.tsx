'use client';

import { useId } from 'react';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

interface CalendarDateFilterProps {
  /** Para associar ao `label` externo (`htmlFor`). */
  id?: string;
  value: string;
  /** `null` quando `allowClear` e o campo for limpo (ex.: fila sem data). */
  onChange: (iso: string | null) => void;
  label?: string;
  /** Container (`flex`): input de data + opcional botão «Hoje». */
  wrapperClassName?: string;
  /** @deprecated use `wrapperClassName` */
  buttonClassName?: string;
  /** Classes do `input type="date"` (único campo; calendário nativo do navegador). */
  nativePickerClassName?: string;
  /** Botão «Hoje» ao lado do input (sem modal). */
  showTodayShortcut?: boolean;
  todayButtonClassName?: string;
  allowClear?: boolean;
}

export default function CalendarDateFilter({
  id: idProp,
  value,
  onChange,
  label = 'Filtrar por data',
  wrapperClassName,
  buttonClassName,
  nativePickerClassName,
  showTodayShortcut = true,
  todayButtonClassName,
  allowClear = false,
}: CalendarDateFilterProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;

  const wrapper =
    wrapperClassName ||
    buttonClassName ||
    'inline-flex w-full max-w-full items-center gap-2';

  const inputDefault =
    'min-h-11 min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  const todayDefault =
    'shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  return (
    <div className={`${wrapper} touch-manipulation`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        value={value || ''}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (!v) {
            if (allowClear) onChange(null);
            return;
          }
          onChange(v);
        }}
        aria-label={label}
        className={nativePickerClassName || inputDefault}
      />
      {showTodayShortcut && (
        <button
          type="button"
          className={todayButtonClassName || todayDefault}
          onClick={() => onChange(getTodayISOInBrazilTimezone())}
        >
          Hoje
        </button>
      )}
    </div>
  );
}
