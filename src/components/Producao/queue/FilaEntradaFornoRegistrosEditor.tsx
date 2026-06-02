'use client';

import FilaRegistroLinhaLabel from '@/components/Producao/queue/FilaRegistroLinhaLabel';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteEntradaFornoProductionStepLog,
  updateEntradaFornoRegistroLog,
} from '@/app/actions/producao-etapas-actions';
import { MAX_LATAS_ENTRADA_FORNO } from '@/lib/utils/forno-volume';
import type { FilaEntradaFornoRegistroRow } from '@/components/Producao/queue/production-queue-types';

type Props = {
  ordemProducaoId: string;
  entradas: FilaEntradaFornoRegistroRow[];
  unidadesAssadeira?: number | null;
  onRefresh: () => void;
};

export default function FilaEntradaFornoRegistrosEditor({
  ordemProducaoId,
  entradas,
  unidadesAssadeira,
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
  }, [ordemProducaoId, entradas, resetEdit]);

  const iniciarEdicao = (row: FilaEntradaFornoRegistroRow) => {
    setEditingLogId(row.log_id);
    setLatasDraft(String(Math.round(row.latas)));
    setError(null);
  };

  const onSave = async () => {
    if (!editingLogId) return;
    const latas = Math.round(Number(latasDraft.replace(',', '.')));
    if (!Number.isFinite(latas) || latas < 1 || latas > MAX_LATAS_ENTRADA_FORNO) {
      setError(`Informe latas (LT) entre 1 e ${MAX_LATAS_ENTRADA_FORNO}.`);
      return;
    }
    const row = entradas.find((e) => e.log_id === editingLogId);
    if (
      row &&
      row.max_latas_fermentacao > 0 &&
      latas > row.max_latas_fermentacao + 1e-9
    ) {
      setError(
        `No máximo ${Math.round(row.max_latas_fermentacao).toLocaleString('pt-BR')} LT (referência na fermentação).`,
      );
      return;
    }
    setSavingId(editingLogId);
    setError(null);
    try {
      const r = await updateEntradaFornoRegistroLog({
        log_id: editingLogId,
        ordem_producao_id: ordemProducaoId,
        assadeiras_lt: latas,
        unidades_assadeira: unidadesAssadeira,
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
    if (!window.confirm('Excluir esta entrada no forno?')) return;
    setDeletingId(logId);
    setError(null);
    try {
      const r = await deleteEntradaFornoProductionStepLog({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
      });
      if (!r.success) {
        setError(r.error ?? 'Erro ao excluir entrada no forno.');
        return;
      }
      if (editingLogId === logId) resetEdit();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (entradas.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 sm:text-xs">Nenhuma entrada registada nesta ordem.</p>
    );
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        Entradas no forno
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {entradas.map((e) => {
          const editando = editingLogId === e.log_id;
          return (
            <li
              key={e.log_id}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                editando ? 'border-orange-300 bg-orange-50/90' : 'border-slate-200 bg-white'
              }`}
            >
              {editando ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    <FilaRegistroLinhaLabel
                      rotuloExibicao={e.rotulo_exibicao ?? `Carrinho ${e.carrinho}`}
                      ehRegistroAdiantado={e.eh_registro_adiantado}
                      latas={e.latas}
                      className="font-medium text-slate-900"
                    />
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">LT</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_LATAS_ENTRADA_FORNO}
                      value={latasDraft}
                      onChange={(ev) => setLatasDraft(ev.target.value)}
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                    />
                    {e.max_latas_fermentacao > 0 ? (
                      <span className="text-[10px] text-slate-500">
                        máx. ref. {Math.round(e.max_latas_fermentacao)} LT
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={savingId === e.log_id}
                      onClick={() => void onSave()}
                      className="rounded border border-slate-800 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {savingId === e.log_id ? '…' : 'Salvar'}
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
                    rotuloExibicao={e.rotulo_exibicao ?? `Carrinho ${e.carrinho}`}
                    ehRegistroAdiantado={e.eh_registro_adiantado}
                    latas={e.latas}
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {e.em_andamento ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        Em andamento
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(e)}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === e.log_id}
                      onClick={() => void onDelete(e.log_id)}
                      className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingId === e.log_id ? '…' : 'Excluir'}
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
