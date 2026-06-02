'use client';

import FilaRegistroLinhaLabel from '@/components/Producao/queue/FilaRegistroLinhaLabel';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteRegistroEtapaProducao,
  updateEntradaEmbalagemLogLatas,
} from '@/app/actions/producao-etapas-actions';
import { MAX_LATAS_ENTRADA_EMBALAGEM } from '@/lib/utils/entrada-embalagem-saida';
import type { FilaEntradaEmbalagemRegistroRow } from '@/components/Producao/queue/production-queue-types';

type Props = {
  ordemProducaoId: string;
  registros: FilaEntradaEmbalagemRegistroRow[];
  onRefresh: () => void;
};

export default function FilaEntradaEmbalagemRegistrosEditor({
  ordemProducaoId,
  registros,
  onRefresh,
}: Props) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [latasDraft, setLatasDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetEdit = useCallback(() => {
    setEditingLogId(null);
    setLatasDraft('');
    setError(null);
  }, []);

  useEffect(() => {
    resetEdit();
  }, [ordemProducaoId, registros, resetEdit]);

  const iniciarEdicao = (row: FilaEntradaEmbalagemRegistroRow) => {
    setEditingLogId(row.log_id);
    setLatasDraft(String(Math.max(1, Math.round(row.latas))));
    setError(null);
  };

  const onSave = async () => {
    if (!editingLogId) return;
    const row = registros.find((r) => r.log_id === editingLogId);
    const max =
      row && row.max_latas_disponivel > 0
        ? Math.min(MAX_LATAS_ENTRADA_EMBALAGEM, row.max_latas_disponivel)
        : MAX_LATAS_ENTRADA_EMBALAGEM;
    const latas = Math.round(Number(latasDraft.replace(',', '.')));
    if (!Number.isFinite(latas) || latas < 1 || latas > max) {
      setError(`Informe latas (LT) entre 1 e ${max}.`);
      return;
    }
    setSavingId(editingLogId);
    setError(null);
    try {
      const r = await updateEntradaEmbalagemLogLatas({
        log_id: editingLogId,
        ordem_producao_id: ordemProducaoId,
        assadeiras: latas,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      resetEdit();
      onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (logId: string) => {
    if (
      !window.confirm(
        'Reverter esta entrada? As latas voltam ao saldo disponível do carrinho na saída do forno.',
      )
    ) {
      return;
    }
    setDeletingId(logId);
    setError(null);
    try {
      const r = await deleteRegistroEtapaProducao({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
      });
      if (!r.success) {
        setError(r.error ?? 'Erro ao excluir entrada na embalagem.');
        return;
      }
      if (editingLogId === logId) resetEdit();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (registros.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 sm:text-xs">Nenhum lançamento registado nesta ordem.</p>
    );
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        Entradas na embalagem
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {registros.map((r) => {
          const editando = editingLogId === r.log_id;
          const bloqueado = r.bloqueado === true;
          const podeEditar = !r.em_andamento && !bloqueado;
          const maxEdit =
            r.max_latas_disponivel > 0
              ? Math.min(MAX_LATAS_ENTRADA_EMBALAGEM, r.max_latas_disponivel)
              : MAX_LATAS_ENTRADA_EMBALAGEM;
          return (
            <li
              key={r.log_id}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                editando ? 'border-indigo-300 bg-indigo-50/90' : 'border-slate-200 bg-white'
              }`}
            >
              {editando && podeEditar ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    <FilaRegistroLinhaLabel
                      rotuloExibicao={r.rotulo_exibicao ?? `Carrinho ${r.carrinho}`}
                      ehRegistroAdiantado={r.eh_registro_adiantado}
                      latas={r.latas}
                      className="font-medium text-slate-900"
                    />
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">LT</span>
                    <input
                      type="number"
                      min={1}
                      max={maxEdit}
                      value={latasDraft}
                      onChange={(e) => setLatasDraft(e.target.value)}
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                    />
                    {r.max_latas_disponivel > 0 ? (
                      <span className="text-[10px] text-slate-500">
                        máx. {Math.round(maxEdit)} LT
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={savingId === r.log_id}
                      onClick={() => void onSave()}
                      className="rounded border border-slate-800 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {savingId === r.log_id ? '…' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={resetEdit}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FilaRegistroLinhaLabel
                    rotuloExibicao={r.rotulo_exibicao ?? `Carrinho ${r.carrinho}`}
                    ehRegistroAdiantado={r.eh_registro_adiantado}
                    latas={r.latas}
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {r.em_andamento ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        Em andamento
                      </span>
                    ) : null}
                    {bloqueado ? (
                      <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        Encerrado
                      </span>
                    ) : podeEditar ? (
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(r)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={deletingId === r.log_id || bloqueado}
                      title={bloqueado ? 'Carrinho encerrado administrativamente' : undefined}
                      onClick={() => void onDelete(r.log_id)}
                      className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === r.log_id ? '…' : 'Excluir'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
