'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  filaGrupoSaidaFornoEstadoVisual,
  saidaFornoGroupProgressMetrics,
  type FilaGrupoProdutoEstadoVisual,
} from '@/components/Producao/queue/production-queue-metrics';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

function shellGrupoSaida(estado: FilaGrupoProdutoEstadoVisual, joinFaltando: boolean): string {
  if (joinFaltando) return 'border-rose-200 bg-rose-50/30';
  switch (estado) {
    case 'finalizada':
      return 'border-emerald-200/90 bg-emerald-50/35';
    case 'em_andamento':
      return 'border-amber-200/90 bg-amber-50/40';
    case 'proximo':
      return 'border-sky-400/75 bg-sky-50/45 ring-1 ring-sky-200/50';
    default:
      return 'border-gray-100 bg-white';
  }
}

function seloGrupoSaida(estado: FilaGrupoProdutoEstadoVisual): { label: string; cn: string } | null {
  switch (estado) {
    case 'finalizada':
      return {
        label: 'Etapa ok',
        cn: 'rounded-full border border-emerald-300/90 bg-emerald-100/95 px-2 py-0.5 text-[10px] font-semibold text-emerald-950 sm:text-xs',
      };
    case 'em_andamento':
      return {
        label: 'Em andamento',
        cn: 'rounded-full border border-amber-300/90 bg-amber-100/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 sm:text-xs',
      };
    case 'proximo':
      return {
        label: 'Próximo',
        cn: 'rounded-full border border-sky-400/90 bg-sky-100/95 px-2 py-0.5 text-[10px] font-semibold text-sky-950 sm:text-xs',
      };
    case 'pendente':
      return {
        label: 'Não iniciado',
        cn: 'rounded-full border border-slate-300/90 bg-slate-100/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 sm:text-xs',
      };
    default:
      return null;
  }
}

interface Props {
  saidaFornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedSaidaFornoProdutoId: string | null;
  setExpandedSaidaFornoProdutoId: (id: string | null) => void;
  router: { push: (href: string) => void };
  filaSecao?: 'active' | 'prontos';
}

export default function ProductionQueueSaidaFornoGroups({
  saidaFornoGroups,
  expandedSaidaFornoProdutoId,
  setExpandedSaidaFornoProdutoId,
  router,
  filaSecao = 'active',
}: Props) {
  return (
    <>
      {saidaFornoGroups.map(({ produto_id, orders }, groupIndex) => {
        const exp = expandedSaidaFornoProdutoId === produto_id;
        const g = saidaFornoGroupProgressMetrics(orders);
        const prodNome = orders[0].produtos.nome;
        const joinFaltando = orders.some((o) => o.produtoJoinFaltando);
        const estadoGrupo = filaGrupoSaidaFornoEstadoVisual(orders, {
          fromProntosSection: filaSecao === 'prontos',
          isFirstActiveGroup: filaSecao === 'active' && groupIndex === 0,
        });
        const shell = shellGrupoSaida(estadoGrupo, joinFaltando);
        const selo = seloGrupoSaida(estadoGrupo);

        return (
          <div
            key={produto_id}
            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${shell}`}
          >
            <button
              type="button"
              onClick={() => setExpandedSaidaFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full min-h-[52px] items-center justify-between gap-2.5 p-3 text-left transition-colors hover:bg-white/40 active:bg-white/55 sm:min-h-0 sm:gap-3 sm:p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold leading-tight text-gray-900 sm:text-base">
                    {prodNome}
                  </h3>
                  {selo && <span className={selo.cn}>{selo.label}</span>}
                </div>
              </div>
              <span className="material-icons shrink-0 text-2xl text-gray-400 sm:text-xl">
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {exp && (
              <div className="border-t border-gray-100 px-3 pb-2.5 pt-0 sm:px-3.5 sm:pb-3">
                <div className="pt-2.5">
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
            )}
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/60 px-3 py-2.5">
                <ul className="space-y-1.5">
                  {orders.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white bg-white px-2.5 py-2 shadow-sm"
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
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center justify-center gap-1 ${
                          item.produtoJoinFaltando
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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
