'use client';

import { DateField } from '@/components/ui/DateField';
import type { InsumoHistoricoPreset } from '@/domain/insumos/insumo-historico-periodo';

type Props = {
  presetAtivo: InsumoHistoricoPreset | null;
  de: string;
  ate: string;
  onPreset: (preset: InsumoHistoricoPreset) => void;
  onDe: (value: string) => void;
  onAte: (value: string) => void;
};

const PRESETS: { id: InsumoHistoricoPreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '3dias', label: '3 dias' },
];

export default function InsumoHistoricoPeriodoFiltro({
  presetAtivo,
  de,
  ate,
  onPreset,
  onDe,
  onAte,
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-stone-200"
        role="group"
        aria-label="Atalhos de período"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPreset(preset.id)}
            className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              presetAtivo === preset.id
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
          De
          <DateField
            value={de}
            widthClass="w-full"
            onChange={(event) => onDe(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
          Até
          <DateField
            value={ate}
            widthClass="w-full"
            onChange={(event) => onAte(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
