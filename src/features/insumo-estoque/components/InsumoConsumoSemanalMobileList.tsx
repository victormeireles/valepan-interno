'use client';

import { useState } from 'react';
import { getInsumoConsumoDetalhesPorProduto } from '@/app/actions/insumo-consumo-actions';
import type {
  InsumoConsumoPeriodo,
  InsumoConsumoPeriodoColuna,
} from '@/domain/insumos/insumo-consumo-semanal-periodo';
import type {
  InsumoConsumoReceitaDetalhe,
  InsumoConsumoSemanalItem,
} from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import InsumoCoberturaBadge from '@/features/insumo-estoque/components/InsumoCoberturaBadge';
import { insumoCoberturaVisualTone } from '@/features/insumo-estoque/insumo-cobertura-visual-tone';
import { formatInsumoQuantidadeArredondada } from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoConsumoSemanalItem[];
  periodo: InsumoConsumoPeriodo;
  colunas: InsumoConsumoPeriodoColuna[];
};

export default function InsumoConsumoSemanalMobileList({ items, periodo, colunas }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [detailsByInsumo, setDetailsByInsumo] = useState<
    Record<string, InsumoConsumoReceitaDetalhe[]>
  >({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  if (items.length === 0) return null;

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
    <div className="divide-y divide-stone-200/80">
      {items.map((item, index) => {
        const picoKeys = insumoCoberturaVisualTone.findPicoColunaKeys(
          item.consumoPorSemana,
          item.pico,
        );

        return (
          <article key={item.insumoId} className={configMobileRowClass(index)}>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-stone-900">{item.nome}</h2>
                  <p
                    className={`mt-0.5 font-mono text-sm tabular-nums ${
                      item.estoqueAtual < 0 ? 'font-semibold text-rose-700' : 'text-stone-600'
                    }`}
                  >
                    {formatInsumoQuantidadeArredondada(
                      item.estoqueAtual,
                      item.unidadeResumida,
                    )}
                  </p>
                </div>
                <InsumoCoberturaBadge dias={item.coberturaDias} />
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2">
                {colunas.map((coluna) => {
                  const valor = item.consumoPorSemana[coluna.inicio] ?? 0;
                  const isPico = picoKeys.has(coluna.inicio);
                  return (
                    <div
                      key={`${item.insumoId}-${coluna.inicio}`}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2 ${
                        isPico
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-stone-100 bg-white/70'
                      }`}
                    >
                      <dt
                        className={`text-xs font-medium ${
                          isPico ? 'text-amber-800' : 'text-stone-500'
                        }`}
                      >
                        {coluna.label}
                        {isPico ? ' · pico' : ''}
                      </dt>
                      <dd
                        className={`font-mono text-sm tabular-nums ${
                          isPico ? 'font-medium text-amber-900' : 'text-stone-800'
                        }`}
                      >
                        {formatInsumoQuantidadeArredondada(valor)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50/80 p-2.5">
                <dl className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Média"
                    value={formatInsumoQuantidadeArredondada(item.media)}
                    muted
                  />
                  <div className="rounded-lg border border-stone-100 bg-white px-2.5 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Cobertura
                    </dt>
                    <dd className="mt-1">
                      <InsumoCoberturaBadge dias={item.coberturaDias} />
                    </dd>
                  </div>
                  <Metric
                    label="Pico"
                    value={formatInsumoQuantidadeArredondada(item.pico)}
                    muted
                  />
                  <div className="rounded-lg border border-stone-100 bg-white px-2.5 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Cob. pico
                    </dt>
                    <dd className="mt-1">
                      <InsumoCoberturaBadge dias={item.coberturaPicoDias} />
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-expanded={expandedIds.has(item.insumoId)}
                onClick={() => toggleExpanded(item)}
              >
                <span className="material-icons text-lg" aria-hidden="true">
                  {expandedIds.has(item.insumoId) ? 'expand_less' : 'expand_more'}
                </span>
                Ver consumo por produto
              </button>
              {expandedIds.has(item.insumoId) ? (
                <ReceitasMobileDetalhe
                  item={item}
                  colunas={colunas}
                  detalhes={detailsByInsumo[item.insumoId] ?? []}
                  isLoading={loadingIds.has(item.insumoId)}
                  error={detailErrors[item.insumoId]}
                />
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-white px-2.5 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd
        className={`mt-0.5 font-mono text-sm tabular-nums ${
          muted ? 'text-stone-500' : 'text-stone-800'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ReceitasMobileDetalhe({
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
      <p className="mt-2 rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm text-amber-800">
        Carregando produtos produzidos...
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (detalhes.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm text-stone-500">
        Sem produto identificado para este insumo no período.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        Por produto ({item.unidadeResumida})
      </p>
      {detalhes.map((receita) => (
        <div key={receita.receitaId} className="rounded-xl border border-amber-100 bg-white p-3">
          <p className="font-medium text-stone-900">{receita.receitaNome}</p>
          <dl className="mt-2 grid gap-1.5">
            {colunas.map((coluna) => (
              <div key={coluna.inicio} className="flex items-center justify-between gap-2">
                <dt className="text-xs text-stone-500">{coluna.label}</dt>
                <dd className="font-mono text-xs tabular-nums text-stone-700">
                  {formatInsumoQuantidadeArredondada(
                    receita.consumoPorSemana[coluna.inicio] ?? 0,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
