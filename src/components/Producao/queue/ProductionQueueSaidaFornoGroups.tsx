'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import { saidaFornoGroupProgressMetrics } from '@/components/Producao/queue/production-queue-metrics';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

interface Props {
  saidaFornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedSaidaFornoProdutoId: string | null;
  setExpandedSaidaFornoProdutoId: (id: string | null) => void;
  router: { push: (href: string) => void };
}

export default function ProductionQueueSaidaFornoGroups({
  saidaFornoGroups,
  expandedSaidaFornoProdutoId,
  setExpandedSaidaFornoProdutoId,
  router,
}: Props) {
  return (
    <>
      {saidaFornoGroups.map(({ produto_id, orders }) => {
        const exp = expandedSaidaFornoProdutoId === produto_id;
        const g = saidaFornoGroupProgressMetrics(orders);
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
              onClick={() => setExpandedSaidaFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-slate-50/80 sm:gap-3 sm:p-4"
            >
              <div className="min-w-0 pl-0.5 sm:pl-1">
                <h3 className="text-xs font-bold leading-tight text-gray-900 sm:text-lg sm:leading-normal">
                  {prodNome}
                </h3>
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500 sm:text-xs">
                  {orders.length} OP · barra do produto · atalhos ao expandir
                </p>
              </div>
              <span className="material-icons shrink-0 text-lg text-gray-400 sm:text-xl">
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            <div className="border-t border-gray-100 px-3 pb-2 pt-0 sm:px-4 sm:pb-3">
              <div className="pt-2 sm:pt-3">
                <VolumeTriploProgressoBar
                  variant="compact"
                  meta={g.meta}
                  etapaAnterior={g.entradaForno}
                  etapaAtual={g.saidaForno}
                  unidadeCurta={g.unidadeCurta}
                  unidadesPorAssadeira={g.unidadesPorAssadeira}
                  statsColumnOrder={['atual', 'anterior', 'meta']}
                  labels={{
                    unitLine: '',
                    meta: 'Ordem de produção de hoje',
                    etapaAnterior: 'Volume na etapa anterior (Entrada no forno)',
                    etapaAtual: 'Saída do forno concluída',
                    compactAnterior: 'Ant. (Entrada)',
                    compactAtual: 'Saída',
                    footer: null,
                  }}
                />
              </div>
            </div>
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/60 px-4 py-3 space-y-2">
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
                            router.push(etapaPathForOrdem(item.id, 'saida_forno'));
                          }
                        }}
                        disabled={Boolean(item.produtoJoinFaltando)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                          item.produtoJoinFaltando
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="material-icons text-sm">outbox</span>
                        Saída do forno
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
