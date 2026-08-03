'use client';

import { Fragment, useState } from 'react';
import { getInsumoConsumoDetalhesPorProduto } from '@/app/actions/insumo-consumo-actions';
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
} from '@/components/Config/config-table-styles';
import InsumoCoberturaBadge from '@/features/insumo-estoque/components/InsumoCoberturaBadge';
import { insumoCoberturaVisualTone } from '@/features/insumo-estoque/insumo-cobertura-visual-tone';
import { formatInsumoQuantidadeArredondada } from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoConsumoSemanalItem[];
  periodo: InsumoConsumoPeriodo;
  colunas: InsumoConsumoPeriodoColuna[];
};

const DECISION_CELL =
  'bg-stone-50/90 border-l border-stone-200';
const STICKY_INSUMO =
  'sticky left-0 z-10 border-r border-stone-200 shadow-[2px_0_6px_-2px_rgb(28_25_23_/_0.08)]';

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
      if (next.has(item.insumoId)) next.delete(item.insumoId);
      else next.add(item.insumoId);
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <th
              scope="col"
              className={`${configTableHeadCellClass} ${STICKY_INSUMO} z-20 bg-surface-sunken text-left`}
            >
              <HeadLabel>Insumo</HeadLabel>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} ${DECISION_CELL} text-right`}>
              <HeadLabel>Estoque</HeadLabel>
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
            <th scope="col" className={`${configTableHeadCellClass} text-right text-stone-400`}>
              <HeadLabel>Média</HeadLabel>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} ${DECISION_CELL} text-right`}>
              <HeadLabel>Cobertura</HeadLabel>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right text-stone-400`}>
              <HeadLabel>Pico</HeadLabel>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} ${DECISION_CELL} text-right`}>
              <HeadLabel>Cob. pico</HeadLabel>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200/80">
          {items.map((item, index) => {
            const rowBg = index % 2 === 1 ? 'bg-stone-100/70' : 'bg-white';
            const picoKeys = insumoCoberturaVisualTone.findPicoColunaKeys(
              item.consumoPorSemana,
              item.pico,
            );

            return (
              <Fragment key={item.insumoId}>
                <tr className={`transition-colors hover:bg-amber-50/50 ${rowBg}`}>
                  <td
                    className={`${configTableBodyCellClass} ${STICKY_INSUMO} ${rowBg} font-medium text-stone-900`}
                  >
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-left hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      aria-expanded={expandedIds.has(item.insumoId)}
                      onClick={() => toggleExpanded(item)}
                    >
                      <span className="material-icons text-lg text-stone-400" aria-hidden="true">
                        {expandedIds.has(item.insumoId) ? 'expand_less' : 'expand_more'}
                      </span>
                      <span>{item.nome}</span>
                    </button>
                  </td>
                  <td
                    className={`${configTableBodyCellClass} ${DECISION_CELL} text-right font-mono tabular-nums ${
                      item.estoqueAtual < 0 ? 'font-semibold text-rose-700' : 'text-stone-800'
                    }`}
                  >
                    {formatInsumoQuantidadeArredondada(
                      item.estoqueAtual,
                      item.unidadeResumida,
                    )}
                  </td>
                  {colunas.map((coluna) => {
                    const valor = item.consumoPorSemana[coluna.inicio] ?? 0;
                    const isPico = picoKeys.has(coluna.inicio);
                    return (
                      <td
                        key={`${item.insumoId}-${coluna.inicio}`}
                        className={`${configTableBodyCellClass} text-right font-mono tabular-nums ${
                          isPico
                            ? 'bg-amber-50 font-medium text-amber-900'
                            : valor > 0
                              ? 'text-stone-600'
                              : 'text-stone-300'
                        }`}
                      >
                        {formatInsumoQuantidadeArredondada(valor)}
                      </td>
                    );
                  })}
                  <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-500`}>
                    {formatInsumoQuantidadeArredondada(item.media)}
                  </td>
                  <td className={`${configTableBodyCellClass} ${DECISION_CELL} text-right`}>
                    <InsumoCoberturaBadge dias={item.coberturaDias} />
                  </td>
                  <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-500`}>
                    {formatInsumoQuantidadeArredondada(item.pico)}
                  </td>
                  <td className={`${configTableBodyCellClass} ${DECISION_CELL} text-right`}>
                    <InsumoCoberturaBadge dias={item.coberturaPicoDias} />
                  </td>
                </tr>
                {expandedIds.has(item.insumoId) ? (
                  <tr className="bg-amber-50/30">
                    <td colSpan={colunas.length + 6} className="px-3 py-3">
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
            );
          })}
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
          Consumo por produto produzido ({item.unidadeResumida})
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
                  )}
                </td>
              ))}
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
