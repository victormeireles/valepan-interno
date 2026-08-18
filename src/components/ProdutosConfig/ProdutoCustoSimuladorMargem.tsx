'use client';

import { useId, useState } from 'react';
import ProdutoCustoSimuladorDecimalField from '@/components/ProdutosConfig/ProdutoCustoSimuladorDecimalField';
import {
  formatCustoUnidade,
  formatMargemPercentual,
} from '@/components/ProdutosConfig/produto-custo-format';
import { produtoCustoMargemCalculo } from '@/domain/produtos/produto-custo-margem-calculo';

type Props = {
  custoAntes: number;
  custoDepois: number;
};

const fieldClassName =
  'w-full min-h-11 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 font-mono tabular-nums focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10';

export default function ProdutoCustoSimuladorMargem({ custoAntes, custoDepois }: Props) {
  const fieldId = useId();
  const [precoVenda, setPrecoVenda] = useState<number | undefined>(undefined);
  const margemAntes = produtoCustoMargemCalculo.calcular(precoVenda, custoAntes);
  const margemDepois = produtoCustoMargemCalculo.calcular(precoVenda, custoDepois);
  const depoisClass = margemToneClass(margemAntes?.margemPercentual, margemDepois?.margemPercentual);

  return (
    <div className="border-t border-stone-200 pt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 items-center">
        <label htmlFor={fieldId} className="text-sm font-bold text-stone-900">
          Preço de venda / un
        </label>
        <div className="sm:col-span-2">
          <ProdutoCustoSimuladorDecimalField
            id={fieldId}
            className={fieldClassName}
            placeholder="R$ 0,00"
            value={precoVenda}
            onValueChange={setPrecoVenda}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-1 sm:gap-2 items-baseline">
        <p className="col-span-2 sm:col-span-1 text-sm font-medium text-stone-800">Margem</p>
        <MargemValor
          percentual={margemAntes?.margemPercentual}
          reais={margemAntes?.margemReais}
          className="text-stone-600 text-left sm:text-right"
        />
        <MargemValor
          percentual={margemDepois?.margemPercentual}
          reais={margemDepois?.margemReais}
          className={`text-right ${depoisClass}`}
        />
      </div>
    </div>
  );
}

function MargemValor({
  percentual,
  reais,
  className,
}: {
  percentual: number | undefined;
  reais: number | undefined;
  className: string;
}) {
  if (percentual == null || reais == null) {
    return <p className={`font-mono tabular-nums text-sm text-stone-400 ${className}`}>—</p>;
  }

  return (
    <div className={className}>
      <p className="font-mono tabular-nums text-sm font-semibold">
        {formatMargemPercentual(percentual)}
      </p>
      <p className="font-mono tabular-nums text-xs">{formatCustoUnidade(reais)}</p>
    </div>
  );
}

function margemToneClass(antes: number | undefined, depois: number | undefined): string {
  if (antes == null || depois == null) return 'text-stone-900';
  if (depois > antes) return 'text-emerald-700';
  if (depois < antes) return 'text-rose-700';
  return 'text-stone-900';
}
