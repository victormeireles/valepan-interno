'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  filaGrupoEntradaFornoEstadoVisual,
  fornoGroupProgressMetrics,
  type FilaGrupoProdutoEstadoVisual,
} from '@/components/Producao/queue/production-queue-metrics';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

function shellGrupoForno(estado: FilaGrupoProdutoEstadoVisual, joinFaltando: boolean): string {
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

function seloGrupoForno(estado: FilaGrupoProdutoEstadoVisual): { label: string; cn: string } | null {
  switch (estado) {
    case 'finalizada':
      return {
        label: 'Etapa ok',
        cn: 'rounded-full border border-emerald-300/90 bg-emerald-100/95 px-2 py-0.5 text-xs font-semibold text-emerald-950',
      };
    case 'em_andamento':
      return {
        label: 'Em andamento',
        cn: 'rounded-full border border-amber-300/90 bg-amber-100/95 px-2 py-0.5 text-xs font-semibold text-amber-950',
      };
    case 'proximo':
      return {
        label: 'Próximo',
        cn: 'rounded-full border border-sky-400/90 bg-sky-100/95 px-2 py-0.5 text-xs font-semibold text-sky-950',
      };
    case 'pendente':
      return {
        label: 'Não iniciado',
        cn: 'rounded-full border border-slate-300/90 bg-slate-100/95 px-2 py-0.5 text-xs font-semibold text-slate-700',
      };
    default:
      return null;
  }
}

interface Props {
  fornoGroups: Array<{ produto_id: string; orders: ProductionQueueItem[] }>;
  expandedFornoProdutoId: string | null;
  setExpandedFornoProdutoId: (id: string | null) => void;
  router: { push: (href: string) => void };
  /** Lista ativa vs secção de grupos já completos na etapa. */
  filaSecao?: 'active' | 'prontos';
}

export default function ProductionQueueFornoGroups({
  fornoGroups,
  expandedFornoProdutoId,
  setExpandedFornoProdutoId,
  router,
  filaSecao = 'active',
}: Props) {
  return (
    <>
      {fornoGroups.map(({ produto_id, orders }, groupIndex) => {
        const exp = expandedFornoProdutoId === produto_id;
        const g = fornoGroupProgressMetrics(orders);
        const prodNome = orders[0].produtos.nome;
        const joinFaltando = orders.some((o) => o.produtoJoinFaltando);
        const estadoGrupo = filaGrupoEntradaFornoEstadoVisual(orders, {
          fromProntosSection: filaSecao === 'prontos',
          isFirstActiveGroup: filaSecao === 'active' && groupIndex === 0,
        });
        const shell = shellGrupoForno(estadoGrupo, joinFaltando);
        const selo = seloGrupoForno(estadoGrupo);

        return (
          <div
            key={produto_id}
            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${shell}`}
          >
            <button
              type="button"
              onClick={() => setExpandedFornoProdutoId(exp ? null : produto_id)}
              className="flex w-full min-h-[52px] items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/40 active:bg-white/55 sm:min-h-[48px] sm:gap-2 sm:py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-gray-900 sm:leading-tight">
                    {prodNome}
                  </h3>
                  {selo && <span className={selo.cn}>{selo.label}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs leading-tight text-gray-500">
                  {orders.length} OP · entrada forno
                </p>
              </div>
              <span className="material-icons shrink-0 text-xl text-gray-400" aria-hidden>
                {exp ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {exp && (
              <div className="border-t border-gray-100 px-2.5 pb-2 sm:px-3 sm:pb-2">
                <div className="pt-2 sm:pt-2">
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
            )}
            {exp && (
              <div className="border-t border-gray-100 bg-slate-50/60 px-2.5 py-2 sm:px-3 sm:py-2.5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    title="Registrar entrada no forno"
                    onClick={() => {
                      const target = orders.find((o) => !o.produtoJoinFaltando) ?? null;
                      if (target) {
                        router.push(etapaPathForOrdem(target.id, 'entrada_forno'));
                      }
                    }}
                    disabled={joinFaltando}
                    className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold leading-none ${
                      joinFaltando
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <span className="material-icons text-base leading-none sm:text-sm">local_fire_department</span>
                    Registrar entrada
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
