'use client';

import { PRODUTO_RECEITA_TIPO_LABELS } from '@/components/ProdutosConfig/produto-receita-tipo-options';
import {
  formatCustoUnidade,
  formatDeltaPercentual,
  formatDeltaReais,
} from '@/components/ProdutosConfig/produto-custo-format';
import ProdutoCustoSimuladorMargem from '@/components/ProdutosConfig/ProdutoCustoSimuladorMargem';
import type {
  ProdutoCustoComparacao,
  ProdutoCustoTipoReceita,
  ProdutoCustoVinculoResultado,
} from '@/domain/produtos/produto-custo-unitario-types';

type Props = {
  comparacao: ProdutoCustoComparacao;
};

const AVISO_COPY: Record<string, string> = {
  quantidade_invalida: 'Quantidade deve ser maior que zero.',
  sem_ingredientes: 'Receita sem ingredientes.',
  insumo_sem_custo: 'Há insumo sem custo cadastrado (conta como R$ 0).',
};

export default function ProdutoCustoSimuladorResultado({ comparacao }: Props) {
  const tipos = uniqueTipos(comparacao);
  const deltaClass =
    comparacao.deltaReais < 0
      ? 'text-emerald-700'
      : comparacao.deltaReais > 0
        ? 'text-rose-700'
        : 'text-stone-600';

  return (
    <section
      aria-label="Comparação de custo"
      className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3"
    >
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        <span>Tipo</span>
        <span className="text-right">Antes</span>
        <span className="text-right">Depois</span>
      </div>

      {tipos.map((tipo) => {
        const antes = byTipo(comparacao.antes.porTipo, tipo);
        const depois = byTipo(comparacao.depois.porTipo, tipo);
        return (
          <div
            key={tipo}
            className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-1 sm:gap-2 items-baseline"
          >
            <p className="col-span-2 sm:col-span-1 text-sm font-medium text-stone-800">
              {PRODUTO_RECEITA_TIPO_LABELS[tipo]}
            </p>
            <p className="font-mono tabular-nums text-sm text-stone-600 text-left sm:text-right">
              {antes ? formatCustoUnidade(antes.custoPorUnidade) : '—'}
            </p>
            <p className="font-mono tabular-nums text-sm text-stone-900 text-right">
              {depois ? formatCustoUnidade(depois.custoPorUnidade) : '—'}
            </p>
            <Avisos resultado={depois} />
          </div>
        );
      })}

      <div className="border-t border-stone-200 pt-3 grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 items-baseline">
        <p className="col-span-2 sm:col-span-1 text-sm font-bold text-stone-900">Total / un</p>
        <p className="font-mono tabular-nums text-sm font-semibold text-stone-600 text-left sm:text-right">
          {formatCustoUnidade(comparacao.antes.custoUnitario)}
        </p>
        <p className="font-mono tabular-nums text-base font-bold text-stone-900 text-right">
          {formatCustoUnidade(comparacao.depois.custoUnitario)}
        </p>
      </div>

      <p className={`font-mono tabular-nums text-sm ${deltaClass}`}>
        Diferença: {formatDeltaReais(comparacao.deltaReais)} ({formatDeltaPercentual(comparacao.deltaPercentual)})
      </p>

      <ProdutoCustoSimuladorMargem
        custoAntes={comparacao.antes.custoUnitario}
        custoDepois={comparacao.depois.custoUnitario}
      />
    </section>
  );
}

function byTipo(
  itens: ProdutoCustoVinculoResultado[],
  tipo: ProdutoCustoTipoReceita,
): ProdutoCustoVinculoResultado | undefined {
  return itens.find((item) => item.tipo === tipo);
}

function uniqueTipos(comparacao: ProdutoCustoComparacao): ProdutoCustoTipoReceita[] {
  const seen = new Set<ProdutoCustoTipoReceita>();
  const ordered: ProdutoCustoTipoReceita[] = [];
  for (const item of [...comparacao.antes.porTipo, ...comparacao.depois.porTipo]) {
    if (seen.has(item.tipo)) continue;
    seen.add(item.tipo);
    ordered.push(item.tipo);
  }
  return ordered;
}

function Avisos({ resultado }: { resultado?: ProdutoCustoVinculoResultado }) {
  if (!resultado?.avisos.length) return null;
  return (
    <p className="col-span-2 sm:col-span-3 text-xs text-amber-800">
      {resultado.avisos.map((aviso) => AVISO_COPY[aviso]).join(' ')}
    </p>
  );
}
