'use client';

import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';

type TurnoSegmentFieldProps = {
  turnos: ProducaoTurnoCadastrado[];
  value: ProducaoTurnoNumero | null;
  onChange: (numero: ProducaoTurnoNumero) => void;
  disabled?: boolean;
};

export function TurnoSegmentField({
  turnos,
  value,
  onChange,
  disabled = false,
}: TurnoSegmentFieldProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-stone-800">Turno</legend>
      <div className="flex flex-wrap gap-2">
        {turnos.map((turno) => {
          const selected = value === turno.numero;
          return (
            <button
              key={turno.numero}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(turno.numero)}
              className={[
                'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-4',
                'text-sm font-medium tracking-[-0.004em]',
                'transition-[background,border-color,color] duration-[130ms] ease-out',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-amber-300 bg-amber-100 text-amber-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
              ].join(' ')}
            >
              Turno {turno.numero}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
