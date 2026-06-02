'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  sincronizarPreRequisitosOrdemParaEtapaFila,
  type SincronizarPreRequisitosOverrides,
} from '@/app/actions/producao-fila-sync-actions';
import {
  etapaAnteriorParaCarrinhos,
  type EtapaFilaSyncPreRequisitos,
} from '@/lib/production/producao-fila-sync-chain';
import {
  dividirLatasEmCarrinhos,
  nomeCarrinhoAdiantadoPadrao,
} from '@/lib/production/adiantar-carrinhos-split';
import {
  deltasPorEtapa,
  etapasPreenchidasPorOrigem,
  origensDisponiveis,
  ROTULO_ORIGEM,
  type EtapaPreenchivel,
  type OrigemAdiantamento,
  type VolumesEtapasAdiantar,
} from '@/lib/production/adiantar-origens';
import {
  fermentacaoMetaLt,
  massaReceitasNecessarias,
} from '@/components/Producao/queue/production-queue-metrics';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';

const ROTULO_ETAPA: Record<EtapaPreenchivel, string> = {
  fermentacao: 'Fermentação',
  entrada_forno: 'Entrada forno',
  saida_forno: 'Saída forno',
  entrada_embalagem: 'Entrada embalagem',
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default function PreRequisitoSyncConfirmModal({
  isOpen,
  item,
  etapaFila,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  item: ProductionQueueItem | null;
  etapaFila: EtapaFilaSyncPreRequisitos;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [receitasMassa, setReceitasMassa] = useState(1);
  const [qtdPorOrigem, setQtdPorOrigem] = useState<Record<string, string>>({});
  const [numerosPorOrigem, setNumerosPorOrigem] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cartStage = useMemo(() => etapaAnteriorParaCarrinhos(etapaFila), [etapaFila]);
  const apenasMassa = cartStage == null;

  const volumes: VolumesEtapasAdiantar | null = useMemo(() => {
    if (!item) return null;
    return {
      metaLt: fermentacaoMetaLt(item),
      fermentacao: item.fermentacao_volume_concluido ?? 0,
      entradaForno: item.forno_entrada_latas_total ?? 0,
      saidaForno: item.saida_forno_bandejas_total ?? 0,
      entradaEmbalagem: item.entrada_embalagem_latas_total ?? 0,
    };
  }, [item]);

  const origens = useMemo(
    () => (item && volumes && !apenasMassa ? origensDisponiveis(volumes, etapaFila) : []),
    [item, volumes, apenasMassa, etapaFila],
  );

  const etapasPreenchiveis = useMemo(
    () => (apenasMassa ? [] : etapasPreenchidasPorOrigem('inicio', etapaFila)),
    [apenasMassa, etapaFila],
  );

  useEffect(() => {
    if (!isOpen || !item) return;
    const rb = item.receitas_batidas ?? 0;
    setReceitasMassa(rb > 0 ? Math.max(1, Math.round(rb)) : 1);
    setQtdPorOrigem({});
    setNumerosPorOrigem({});
    setError(null);
  }, [isOpen, item?.id, etapaFila]);

  // Derivados (sempre calculados; só usados quando aberto).
  const saldoDe = (origem: OrigemAdiantamento) =>
    origens.find((o) => o.origem === origem)?.saldo ?? 0;
  const qtdDe = (origem: OrigemAdiantamento) =>
    clampInt(Number(qtdPorOrigem[origem] ?? '') || 0, 0, saldoDe(origem));

  const adiantamentosQtd = origens
    .map((o) => ({ origem: o.origem, latas: qtdDe(o.origem) }))
    .filter((a) => a.latas > 0);
  const totalAdiantar = adiantamentosQtd.reduce((s, a) => s + a.latas, 0);
  const deltas = deltasPorEtapa(adiantamentosQtd, etapaFila);

  if (!isOpen || !item) return null;

  const setQtdAt = (origem: OrigemAdiantamento, value: string) => {
    setQtdPorOrigem((prev) => ({ ...prev, [origem]: value }));
  };
  const setNumeroAt = (origem: OrigemAdiantamento, idx: number, value: string) => {
    setNumerosPorOrigem((prev) => {
      const atual = [...(prev[origem] ?? [])];
      while (atual.length <= idx) atual.push('');
      atual[idx] = value;
      return { ...prev, [origem]: atual };
    });
  };

  const buildOverrides = (): SincronizarPreRequisitosOverrides => {
    const o: SincronizarPreRequisitosOverrides = {};
    if (apenasMassa) {
      o.receitasBatidasMassa = Math.max(1, Math.round(receitasMassa));
      return o;
    }
    o.receitasMassaMeta = massaReceitasNecessarias(item);
    o.adiantamentos = origens
      .map((or) => {
        const latas = qtdDe(or.origem);
        if (latas <= 0) return null;
        const chunks = dividirLatasEmCarrinhos(latas);
        const nums = numerosPorOrigem[or.origem] ?? [];
        return {
          origem: or.origem,
          latas,
          carrinhosNumeros: chunks.map((_, i) => nums[i] ?? ''),
        };
      })
      .filter((a): a is NonNullable<typeof a> => a != null);
    return o;
  };

  const submit = () => {
    if (!apenasMassa && totalAdiantar <= 0) {
      setError('Informe de qual etapa e quantas latas adiantar.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await sincronizarPreRequisitosOrdemParaEtapaFila({
        ordemId: item.id,
        etapaFila,
        overrides: buildOverrides(),
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      onSuccess();
      onClose();
    });
  };

  const fieldClass =
    'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-req-sync-title"
        className="relative max-h-[min(90vh,46rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-violet-50/80 px-4 py-3 sm:px-5">
          <h2 id="pre-req-sync-title" className="text-base font-bold text-violet-950 sm:text-lg">
            Adiantar etapas anteriores
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-violet-800 hover:bg-violet-100 disabled:opacity-50"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1 border-b border-gray-100 pb-3">
            <p className="text-sm font-semibold text-slate-900">{item.produtos.nome}</p>
            <p className="font-mono text-xs text-slate-600">{item.lote_codigo}</p>
            {item.data_producao ? (
              <p className="text-xs text-slate-500">{item.data_producao}</p>
            ) : null}
          </div>

          {apenasMassa ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Receitas batidas
              </span>
              <input
                type="number"
                min={1}
                max={500}
                className={fieldClass}
                value={receitasMassa}
                onChange={(e) => setReceitasMassa(clampInt(Number(e.target.value) || 1, 1, 500))}
              />
            </label>
          ) : origens.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
              Não há volume parado em etapas anteriores para adiantar. Registe a etapa atual
              diretamente pelo card.
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  De onde vêm estas latas?
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  Informe quanto adiantar de cada origem. Cada uma completa só as etapas seguintes,
                  criando carrinhos de até 20 LT.
                </p>

                <div className="mt-2 space-y-2">
                  {origens.map((o) => {
                    const qtd = qtdDe(o.origem);
                    const chunks = qtd > 0 ? dividirLatasEmCarrinhos(qtd) : [];
                    return (
                      <div
                        key={o.origem}
                        className="rounded-xl border border-gray-200 bg-gray-50/60 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {ROTULO_ORIGEM[o.origem]}
                            </p>
                            <p className="text-[11px] text-slate-500">{o.saldo} LT disponíveis</p>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={o.saldo}
                            placeholder="0"
                            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm tabular-nums text-gray-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                            value={qtdPorOrigem[o.origem] ?? ''}
                            onChange={(e) => setQtdAt(o.origem, e.target.value)}
                          />
                        </div>

                        {chunks.length > 0 ? (
                          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {chunks.map((lt, i) => (
                              <label key={i} className="block">
                                <span className="text-[10px] text-slate-500">
                                  {nomeCarrinhoAdiantadoPadrao(i)} · {lt} LT
                                </span>
                                <input
                                  type="text"
                                  value={numerosPorOrigem[o.origem]?.[i] ?? ''}
                                  placeholder={nomeCarrinhoAdiantadoPadrao(i)}
                                  onChange={(e) => setNumeroAt(o.origem, i, e.target.value)}
                                  className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-violet-500 focus:outline-none"
                                />
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900">
                  Como ficam as barras
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {etapasPreenchiveis.map((etapa) => {
                    const d = deltas[etapa] ?? 0;
                    return (
                      <span
                        key={etapa}
                        className={
                          d > 0
                            ? 'inline-flex items-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 font-semibold text-white'
                            : 'inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-500'
                        }
                      >
                        {ROTULO_ETAPA[etapa]}
                        {d > 0 ? ` +${d}` : ''}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-violet-900">
                  Total a adiantar: <strong className="tabular-nums">{totalAdiantar}</strong> LT
                </p>
              </div>
            </>
          )}

          {error && (
            <p
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 sm:text-sm"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || (!apenasMassa && totalAdiantar <= 0)}
              onClick={submit}
              className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:opacity-60"
            >
              {pending ? 'A gravar…' : 'Gravar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
