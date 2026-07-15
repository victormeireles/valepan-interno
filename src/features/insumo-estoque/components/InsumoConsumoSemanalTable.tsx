'use client';

import { Fragment, useState } from 'react';
import { getInsumoConsumoDetalhesPorProduto } from '@/app/actions/insumo-estoque-actions';
import type {
  InsumoConsumoPeriodo,
  InsumoConsumoPeriodoColuna,
} from '@/domain/insumos/insumo-consumo-semanal-periodo';
import type {
  InsumoConsumoReceitaDetalhe,
  InsumoConsumoSemanalItem,
} from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableZebraRowClass,
} from '@/components/Config/config-table-styles';
import { formatInsumoQuantidadeArredondada } from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoConsumoSemanalItem[];
  periodo: InsumoConsumoPeriodo;
  colunas: InsumoConsumoPeriodoColuna[];
};

export default function InsumoConsumoSemanalTable({ items, periodo, colunas }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [detailsByInsumo, setDetailsByInsumo] = useState<
    Record<string, InsumoConsumoReceitaDetalhe[]>
  >({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const toggleExpanded = (item: InsumoConsumoSemanalItem) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(item.insumoId)) {
        next.delete(item.insumoId);
      } else {
        next.add(item.insumoId);
      }
      return next;
    });

    if (!expandedIds.has(item.insumoId) && !detailsByInsumo[item.insumoId]) {
      void loadDetails(item.insumoId);
    }
  };

  const loadDetails = async (insumoId: string) => {
    setLoadingIds((current) => new Set(current).add(insumoId));
    setDetailErrors((current) => ({ ...current, [insumoId]: '' }));
    try {
      const detalhes = await getInsumoConsumoDetalhesPorProduto({
        insumoId,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        visualizacao: periodo.visualizacao,
      });
      setDetailsByInsumo((current) => ({ ...current, [insumoId]: detalhes }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar detalhes';
      setDetailErrors((current) => ({ ...current, [insumoId]: message }));
    } finally {
      setLoadingIds((current) => {
        const next = new Set(current);
        next.delete(insumoId);
        return next;
      });
    }
  };

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <HeadLabel>Insumo</HeadLabel>
            </th>
            {colunas.map((coluna) => (
              <th
                key={coluna.inicio}
                scope="col"
                className={`${configTableHeadCellClass} text-right`}
              >
                <HeadLabel>{coluna.label}</HeadLabel>
              </th>
            ))}
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <HeadLabel>Total</HeadLabel>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <Fragment key={item.insumoId}>
              <tr className={configTableZebraRowClass(index)}>
                <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center gap-2 rounded-lg text-left hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-expanded={expandedIds.has(item.insumoId)}
                    onClick={() => toggleExpanded(item)}
                  >
                    <span className="material-icons text-lg text-stone-400" aria-hidden="true">
                      {expandedIds.has(item.insumoId) ? 'expand_less' : 'expand_more'}
                    </span>
                    <span>{item.nome}</span>
                  </button>
                </td>
                {colunas.map((coluna) => (
                  <td
                    key={`${item.insumoId}-${coluna.inicio}`}
                    className={`${configTableBodyCellClass} text-right font-mono tabular-nums ${
                      item.consumoPorSemana[coluna.inicio] > 0
                        ? 'text-stone-800'
                        : 'text-stone-300'
                    }`}
                  >
                    {formatInsumoQuantidadeArredondada(
                      item.consumoPorSemana[coluna.inicio] ?? 0,
                      item.unidadeResumida,
                    )}
                  </td>
                ))}
                <td className={`${configTableBodyCellClass} text-right font-mono font-semibold tabular-nums text-stone-900`}>
                  {formatInsumoQuantidadeArredondada(item.total, item.unidadeResumida)}
                </td>
              </tr>
              {expandedIds.has(item.insumoId) ? (
                <tr className="bg-amber-50/30">
                  <td colSpan={colunas.length + 2} className="px-3 py-3">
                    <ReceitasDetalhe
                      item={item}
                      colunas={colunas}
                      detalhes={detailsByInsumo[item.insumoId] ?? []}
                      isLoading={loadingIds.has(item.insumoId)}
                      error={detailErrors[item.insumoId]}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceitasDetalhe({
  item,
  colunas,
  detalhes,
  isLoading,
  error,
}: {
  item: InsumoConsumoSemanalItem;
  colunas: InsumoConsumoPeriodoColuna[];
  detalhes: InsumoConsumoReceitaDetalhe[];
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading) {
    return (
      <p className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-amber-800">
        Carregando produtos produzidos...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-100 bg-white px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (detalhes.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
        Sem produto identificado para este insumo no período.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-amber-100 bg-white shadow-xs">
      <div className="border-b border-stone-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Consumo por produto produzido
        </p>
      </div>
      <table className="w-full border-collapse text-sm">
        <tbody className="divide-y divide-stone-100">
          {detalhes.map((receita) => (
            <tr key={receita.receitaId}>
              <td className="px-3 py-2 font-medium text-stone-800">{receita.receitaNome}</td>
              {colunas.map((coluna) => (
                <td
                  key={`${receita.receitaId}-${coluna.inicio}`}
                  className="px-3 py-2 text-right font-mono tabular-nums text-stone-700"
                >
                  {formatInsumoQuantidadeArredondada(
                    receita.consumoPorSemana[coluna.inicio] ?? 0,
                    item.unidadeResumida,
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-stone-900">
                {formatInsumoQuantidadeArredondada(receita.total, item.unidadeResumida)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </span>
  );
}
