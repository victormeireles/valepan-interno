'use client';

import { Chip } from '@/components/ui/Chip';
import type { InsumoCustoEstado } from '@/domain/insumos/insumo-custo-estado';

const OPCOES: { id: InsumoCustoEstado; label: string }[] = [
  { id: 'pendente', label: 'Pendente' },
  { id: 'sem_custo', label: 'Sem custo' },
  { id: 'com_custo', label: 'Com custo' },
];

type Props = {
  estado: InsumoCustoEstado;
  valorComCusto: number;
  onEstadoChange: (estado: InsumoCustoEstado) => void;
  onValorComCustoChange: (valor: number) => void;
};

export default function InsumoCustoSegmentControl({
  estado,
  valorComCusto,
  onEstadoChange,
  onValorComCustoChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-semibold text-stone-700">Custo de compra</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Custo de compra">
          {OPCOES.map((opcao) => (
            <Chip
              key={opcao.id}
              active={estado === opcao.id}
              onClick={() => onEstadoChange(opcao.id)}
              className="min-h-11"
            >
              {opcao.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Sem custo: embalagem reutilizável ou fornecida pelo cliente.
        </p>
      </div>

      {estado === 'com_custo' ? (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-stone-700" htmlFor="insumo-custo-valor">
            Valor unitário
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
              R$
            </span>
            <input
              id="insumo-custo-valor"
              type="number"
              step="0.01"
              min="0.01"
              value={valorComCusto > 0 ? valorComCusto : ''}
              onChange={(e) => onValorComCustoChange(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border-2 border-stone-100 bg-stone-50 px-4 py-3 pl-10 font-medium text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
              placeholder="0,00"
              required
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
