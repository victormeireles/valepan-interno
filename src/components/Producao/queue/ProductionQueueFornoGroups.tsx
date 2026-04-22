'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import { fornoGroupProgressMetrics } from '@/components/Producao/queue/production-queue-metrics';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

interface Props {
  fornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedFornoProdutoId: string | null;
  setExpandedFornoProdutoId: (id: string | null) => void;
  router: { push: (href: string) => void };
}

export default function ProductionQueueFornoGroups({
  fornoGroups,
  expandedFornoProdutoId,
  setExpandedFornoProdutoId,
  router,
}: Props) {
  return (
    <>
      {fornoGroups.map(({ produto_id, orders }) => {
        const exp = expandedFornoProdutoId === produto_id;
        const g = fornoGroupProgressMetrics(orders);
        const carrinhosFlat = orders.flatMap((o) =>
          (o.carrinhos_disponiveis_forno ?? []).map((c) => ({
            ...c,
            lote_codigo: o.lote_codigo,
          })),
        );
        const carrinhosUnicos = [...new Map(carrinhosFlat.map((c) => [c.log_id, c])).values()];
        const prodNome = orders[0].produtos.nome;
        const joinFaltando = orders.some((o) => o.produtoJoinFaltando);

        return (
          <div
            key={produto_id}
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              joinFaltando ? 'border-rose-200 bg-rose-50/30' : 'border-gray-100 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setExpandedFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-slate-50/80 sm:gap-3 sm:p-4"
            >
              <div className="min-w-0 pl-0.5 sm:pl-1">
                <h3 className="text-xs font-bold leading-tight text-gray-900 sm:text-lg sm:leading-normal">
                  {prodNome}
                </h3>
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500 sm:text-xs">
                  {orders.length} OP · carrinhos / entrada no forno
                </p>
              </div>
              <span className="material-icons shrink-0 text-lg text-gray-400 sm:text-xl">
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            <div className="border-t border-gray-100 px-3 pb-2 sm:px-4 sm:pb-3">
              <div className="pt-2 sm:pt-3">
                <VolumeTriploProgressoBar
                  variant="compact"
                  meta={g.meta}
                  etapaAnterior={g.fermentacao}
                  etapaAtual={g.forno}
                  unidadeCurta={g.unidadeCurta}
                  unidadesPorAssadeira={g.unidadesPorAssadeira}
                  statsColumnOrder={['atual', 'anterior', 'meta']}
                  labels={{
                    unitLine: '',
                    meta: 'Ordem de produção de hoje',
                    etapaAnterior: 'Volume na etapa anterior (Fermentação)',
                    etapaAtual: 'Entrada no forno',
                    compactAnterior: 'Ferm.',
                    compactAtual: 'Entrada',
                    footer: null,
                  }}
                />
              </div>
            </div>
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/60 px-4 py-3 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                    Carrinhos na fermentação ou com latas a retirar
                  </p>
                  {carrinhosUnicos.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum carrinho disponível (excluídos da lista, sem número, sem latas na fermentação ou já com
                      entrada no forno).
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {carrinhosUnicos.map((c) => (
                        <li
                          key={`${c.lote_codigo}-${c.log_id}`}
                          className="inline-flex flex-col gap-0.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs text-sky-950"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">Carrinho {c.carrinho}</span>
                            {c.em_fermentacao ? (
                              <span className="rounded bg-amber-100 text-amber-900 px-1 py-0 text-[10px] font-semibold uppercase">
                                Fermentando
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 text-slate-700 px-1 py-0 text-[10px] font-semibold uppercase">
                                Retirar
                              </span>
                            )}
                            <span className="text-sky-600/80 font-mono">{c.lote_codigo}</span>
                          </div>
                          <span className="text-sky-800/90">
                            {c.latas_registradas > 0
                              ? `${c.latas_registradas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT na fermentação`
                              : c.em_fermentacao
                                ? 'Defina latas na fermentação'
                                : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ordens</p>
                  <ul className="space-y-2">
                    {orders.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white bg-white px-3 py-2 shadow-sm"
                      >
                        <span className="font-mono text-xs text-gray-500">{item.lote_codigo}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.produtoJoinFaltando) {
                              router.push(etapaPathForOrdem(item.id, 'entrada_forno'));
                            }
                          }}
                          disabled={Boolean(item.produtoJoinFaltando)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                            item.produtoJoinFaltando
                              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="material-icons text-sm">local_fire_department</span>
                          Entrada do forno
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
