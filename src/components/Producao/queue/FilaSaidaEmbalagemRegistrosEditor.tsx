'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteRegistroEtapaProducao,
  updateSaidaEmbalagemLogCaixas,
} from '@/app/actions/producao-etapas-actions';
import type { FilaSaidaEmbalagemRegistroRow } from '@/components/Producao/queue/production-queue-types';

type Props = {
  ordemProducaoId: string;
  registros: FilaSaidaEmbalagemRegistroRow[];
  onRefresh: () => void;
};

export default function FilaSaidaEmbalagemRegistrosEditor({
  ordemProducaoId,
  registros,
  onRefresh,
}: Props) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [caixasDraft, setCaixasDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetEdit = useCallback(() => {
    setEditingLogId(null);
    setCaixasDraft('');
    setError(null);
  }, []);

  useEffect(() => {
    resetEdit();
  }, [ordemProducaoId, registros, resetEdit]);

  const iniciarEdicao = (row: FilaSaidaEmbalagemRegistroRow) => {
    setEditingLogId(row.log_id);
    setCaixasDraft(String(Math.max(0, Math.round(row.caixas))));
    setError(null);
  };

  const onSave = async () => {
    if (!editingLogId) return;
    const caixas = Math.round(Number(caixasDraft.replace(',', '.')));
    if (!Number.isFinite(caixas) || caixas < 0) {
      setError('Informe um número inteiro de caixas (0 ou mais).');
      return;
    }
    setSavingId(editingLogId);
    setError(null);
    try {
      const r = await updateSaidaEmbalagemLogCaixas({
        log_id: editingLogId,
        ordem_producao_id: ordemProducaoId,
        caixas_recebidas: caixas,
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

  const onDelete = async (logId: string, caixas: number) => {
    if (
      !window.confirm(
        `Excluir este lançamento de ${Math.round(caixas)} caixa${caixas === 1 ? '' : 's'}? O estoque será atualizado.`,
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
        setError(r.error ?? 'Erro ao excluir saída de embalagem.');
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
      <p className="text-[11px] text-slate-500 sm:text-xs">Nenhum lançamento de caixas nesta ordem.</p>
    );
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        Saídas de embalagem (caixas)
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {registros.map((r) => {
          const editando = editingLogId === r.log_id;
          const podeEditar = !r.em_andamento;
          return (
            <li
              key={r.log_id}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                editando ? 'border-indigo-300 bg-indigo-50/90' : 'border-slate-200 bg-white'
              }`}
            >
              {editando && podeEditar ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">{r.registrado_em}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">Caixas</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={caixasDraft}
                      onChange={(e) => setCaixasDraft(e.target.value)}
                      className="w-20 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                    />
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
                  <span className="font-medium text-slate-900 tabular-nums">
                    {Math.round(r.caixas)} caixa{Math.round(r.caixas) === 1 ? '' : 's'}
                    <span className="font-normal text-slate-500"> · {r.registrado_em}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {r.em_andamento ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        Em andamento
                      </span>
                    ) : null}
                    {podeEditar ? (
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
                      disabled={deletingId === r.log_id || r.em_andamento}
                      title={r.em_andamento ? 'Conclua ou cancele o lançamento na etapa' : undefined}
                      onClick={() => void onDelete(r.log_id, r.caixas)}
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
