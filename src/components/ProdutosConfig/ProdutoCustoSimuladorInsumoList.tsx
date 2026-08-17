'use client';

import { formatCustoUnidade } from '@/components/ProdutosConfig/produto-custo-format';
import ProdutoCustoSimuladorDecimalField from '@/components/ProdutosConfig/ProdutoCustoSimuladorDecimalField';
import type { ProdutoCustoIngrediente } from '@/domain/produtos/produto-custo-unitario-types';

type Props = {
  insumos: ProdutoCustoIngrediente[];
  custoOverrides: Record<string, number>;
  onCustoChange: (insumoId: string, valor: number | undefined) => void;
};

const fieldClassName =
  'w-full min-h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-mono tabular-nums focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10';

export default function ProdutoCustoSimuladorInsumoList({
  insumos,
  custoOverrides,
  onCustoChange,
}: Props) {
  if (insumos.length === 0) {
    return (
      <p className="text-sm text-stone-500">Nenhum insumo nas receitas deste cenário.</p>
    );
  }

  return (
    <section aria-label="Insumos usados" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Insumos usados
      </h3>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {insumos.map((insumo) => {
          const override = custoOverrides[insumo.insumoId];
          const atualLabel =
            insumo.custoUnitario == null
              ? 'Sem custo'
              : formatCustoUnidade(insumo.custoUnitario);
          return (
            <div
              key={insumo.insumoId}
              className="px-3 py-2.5 sm:px-4 sm:py-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] gap-2 sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{insumo.insumoNome}</p>
                <p className="text-[11px] text-stone-500">{insumo.unidade ?? 'un'}</p>
              </div>
              <p className="font-mono tabular-nums text-sm text-stone-600 sm:text-right">
                {atualLabel}
              </p>
              <div>
                <label className="sr-only" htmlFor={`custo-simulado-${insumo.insumoId}`}>
                  Custo simulado de {insumo.insumoNome}
                </label>
                <ProdutoCustoSimuladorDecimalField
                  id={`custo-simulado-${insumo.insumoId}`}
                  className={fieldClassName}
                  placeholder="Simulado"
                  value={override}
                  onValueChange={(valor) => onCustoChange(insumo.insumoId, valor)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
