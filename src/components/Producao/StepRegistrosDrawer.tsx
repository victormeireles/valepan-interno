'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductionStep } from '@/domain/types/producao-etapas';
import {
  deleteRegistroEtapaProducao,
  listRegistrosEtapaForUi,
  updateEntradaEmbalagemLogLatas,
  updateFermentacaoRegistroLog,
  updateSaidaEmbalagemLogCaixas,
  type StepRegistroUiItem,
} from '@/app/actions/producao-etapas-actions';
import { FERMENTACAO_ASSADEIRAS_MAX } from '@/lib/production/fermentacao-iniciar-e-finalizar';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

type Props = {
  ordemProducaoId: string;
  etapa: ProductionStep;
};

export default function StepRegistrosDrawer({ ordemProducaoId, etapa }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StepRegistroUiItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [caixaDraft, setCaixaDraft] = useState<Record<string, string>>({});
  const [latasDraft, setLatasDraft] = useState<Record<string, string>>({});
  const [carrinhoDraft, setCarrinhoDraft] = useState<Record<string, string>>({});
  const [assadeirasDraft, setAssadeirasDraft] = useState<Record<string, string>>({});
  const [savingCaixasId, setSavingCaixasId] = useState<string | null>(null);
  const [savingLatasId, setSavingLatasId] = useState<string | null>(null);
  const [savingFermentacaoId, setSavingFermentacaoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listRegistrosEtapaForUi(ordemProducaoId, etapa);
      if (!r.success) {
        setItems([]);
        setError(r.error);
        return;
      }
      setItems(r.data);
      const draftCaixas: Record<string, string> = {};
      const draftLatas: Record<string, string> = {};
      const draftCarrinho: Record<string, string> = {};
      const draftAssadeiras: Record<string, string> = {};
      for (const it of r.data) {
        if (etapa === 'saida_embalagem') {
          draftCaixas[it.id] =
            it.caixasEditaveis != null ? String(it.caixasEditaveis) : '';
        }
        if (etapa === 'entrada_embalagem') {
          draftLatas[it.id] =
            it.latasEditaveis != null ? String(it.latasEditaveis) : '';
        }
        if (etapa === 'fermentacao') {
          draftCarrinho[it.id] = it.carrinhoEditavel ?? '';
          draftAssadeiras[it.id] =
            it.assadeirasLtEditavel != null ? String(it.assadeirasLtEditavel) : '';
        }
      }
      setCaixaDraft(draftCaixas);
      setLatasDraft(draftLatas);
      setCarrinhoDraft(draftCarrinho);
      setAssadeirasDraft(draftAssadeiras);
    } finally {
      setLoading(false);
    }
  }, [ordemProducaoId, etapa]);

  const openPanel = () => {
    setOpen(true);
    void load();
  };

  const closePanel = () => {
    setOpen(false);
    setError(null);
  };

  const onDelete = async (id: string) => {
    const msg =
      etapa === 'entrada_embalagem'
        ? 'Reverter esta entrada? As latas voltam ao saldo disponível do carrinho na saída do forno.'
        : 'Excluir este registro?';
    if (!window.confirm(msg)) return;
    setDeletingId(id);
    setError(null);
    try {
      const r = await deleteRegistroEtapaProducao({ log_id: id, ordem_producao_id: ordemProducaoId });
      if (!r.success) {
        setError(r.error);
        return;
      }
      await load();
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const onSaveCaixas = async (logId: string) => {
    const raw = (caixaDraft[logId] ?? '').trim();
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0) {
      setError('Informe um número inteiro de caixas (0 ou mais).');
      return;
    }
    setSavingCaixasId(logId);
    setError(null);
    try {
      const r = await updateSaidaEmbalagemLogCaixas({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
        caixas_recebidas: n,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      await load();
      router.refresh();
    } finally {
      setSavingCaixasId(null);
    }
  };

  const onSaveFermentacao = async (logId: string) => {
    const carrinho = (carrinhoDraft[logId] ?? '').trim();
    if (!carrinho) {
      setError('Informe o número do carrinho.');
      return;
    }
    const ass = Math.round(Number((assadeirasDraft[logId] ?? '').trim()));
    if (!Number.isFinite(ass) || ass < 1 || ass > FERMENTACAO_ASSADEIRAS_MAX) {
      setError(`Informe assadeiras (LT) entre 1 e ${FERMENTACAO_ASSADEIRAS_MAX}.`);
      return;
    }
    setSavingFermentacaoId(logId);
    setError(null);
    try {
      const r = await updateFermentacaoRegistroLog({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
        numero_carrinho: carrinho,
        assadeiras_lt: ass,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      await load();
      router.refresh();
    } finally {
      setSavingFermentacaoId(null);
    }
  };

  const onSaveLatas = async (logId: string) => {
    const raw = (latasDraft[logId] ?? '').trim();
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 1) {
      setError('Informe um número inteiro de latas (mínimo 1).');
      return;
    }
    setSavingLatasId(logId);
    setError(null);
    try {
      const r = await updateEntradaEmbalagemLogLatas({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
        assadeiras: n,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      await load();
      router.refresh();
    } finally {
      setSavingLatasId(null);
    }
  };

  const onEditMassa = (loteId: string) => {
    router.push(`${etapaPathForOrdem(ordemProducaoId, 'massa')}?loteId=${loteId}`);
    closePanel();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => openPanel()}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:text-sm"
      >
        <span className="material-icons text-base leading-none text-slate-600">history</span>
        Registros
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/35" role="presentation">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Fechar"
            onClick={() => closePanel()}
          />
          <div
            className="relative flex h-full w-[min(100vw,22rem)] flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="step-registros-titulo"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <h2 id="step-registros-titulo" className="text-sm font-bold text-slate-900">
                Registros {!loading ? `(${items.length})` : ''}
              </h2>
              <button
                type="button"
                onClick={() => closePanel()}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar painel"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {error ? (
                <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800">
                  {error}
                </p>
              ) : null}
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum registro nesta etapa.</p>
              ) : (
                <>
                  {etapa === 'entrada_embalagem' ? (
                    <p className="mb-2 text-[11px] leading-snug text-slate-600">
                      Corrija as latas (LT) e salve, ou use Reverter entrada para anular o registro e
                      devolver o saldo ao carrinho na saída do forno.
                    </p>
                  ) : null}
                  {etapa === 'fermentacao' ? (
                    <p className="mb-2 text-[11px] leading-snug text-slate-600">
                      Ajuste carrinho e assadeiras (LT). Carrinhos já no forno não podem ser alterados até
                      excluir a entrada no forno.
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-xs"
                    >
                      <p className="font-semibold text-slate-900">{it.titulo}</p>
                      {it.subtitulo ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{it.subtitulo}</p>
                      ) : null}

                      {etapa === 'saida_embalagem' ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-20 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                            value={caixaDraft[it.id] ?? ''}
                            onChange={(e) =>
                              setCaixaDraft((d) => ({ ...d, [it.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            disabled={savingCaixasId === it.id}
                            onClick={() => void onSaveCaixas(it.id)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {savingCaixasId === it.id ? '…' : 'Salvar'}
                          </button>
                        </div>
                      ) : null}

                      {etapa === 'fermentacao' && !it.emAndamento ? (
                        <div className="mt-2 space-y-1.5">
                          {it.bloqueadoNoForno ? (
                            <span className="inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                              No forno
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-medium text-slate-600">Carrinho</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                aria-label={`Carrinho — ${it.titulo}`}
                                className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                                value={carrinhoDraft[it.id] ?? ''}
                                onChange={(e) =>
                                  setCarrinhoDraft((d) => ({ ...d, [it.id]: e.target.value }))
                                }
                              />
                              <span className="text-[11px] font-medium text-slate-600">LT</span>
                              <input
                                type="number"
                                min={1}
                                max={FERMENTACAO_ASSADEIRAS_MAX}
                                step={1}
                                aria-label={`Assadeiras — ${it.titulo}`}
                                className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                                value={assadeirasDraft[it.id] ?? ''}
                                onChange={(e) =>
                                  setAssadeirasDraft((d) => ({ ...d, [it.id]: e.target.value }))
                                }
                              />
                              <button
                                type="button"
                                disabled={savingFermentacaoId === it.id}
                                onClick={() => void onSaveFermentacao(it.id)}
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {savingFermentacaoId === it.id ? '…' : 'Salvar'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                      {etapa === 'fermentacao' && it.emAndamento ? (
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          Lote em andamento — finalize na tela principal.
                        </p>
                      ) : null}

                      {etapa === 'entrada_embalagem' ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-600">Latas</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            aria-label={`Latas — ${it.titulo}`}
                            className="w-20 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                            value={latasDraft[it.id] ?? ''}
                            onChange={(e) =>
                              setLatasDraft((d) => ({ ...d, [it.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            disabled={savingLatasId === it.id}
                            onClick={() => void onSaveLatas(it.id)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {savingLatasId === it.id ? '…' : 'Salvar latas'}
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {etapa === 'massa' ? (
                          <button
                            type="button"
                            onClick={() => onEditMassa(it.id)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={deletingId === it.id}
                          onClick={() => void onDelete(it.id)}
                          className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {deletingId === it.id
                            ? '…'
                            : etapa === 'entrada_embalagem'
                              ? 'Reverter entrada'
                              : 'Excluir'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
