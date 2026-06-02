'use client';

import FilaRegistroLinhaLabel from '@/components/Producao/queue/FilaRegistroLinhaLabel';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteRegistroEtapaProducao,
  updateFermentacaoRegistroLog,
} from '@/app/actions/producao-etapas-actions';
import { FERMENTACAO_ASSADEIRAS_MAX } from '@/lib/production/fermentacao-iniciar-e-finalizar';
import type { FilaFermentacaoCarrinhoRow } from '@/components/Producao/queue/production-queue-types';

type Props = {
  ordemProducaoId: string;
  carrinhos: FilaFermentacaoCarrinhoRow[];
  unidadesAssadeira?: number | null;
  onRefresh: () => void;
};

export default function FilaFermentacaoCarrinhosEditor({
  ordemProducaoId,
  carrinhos,
  unidadesAssadeira,
  onRefresh,
}: Props) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [carrinhoDraft, setCarrinhoDraft] = useState('');
  const [latasDraft, setLatasDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetEdit = useCallback(() => {
    setEditingLogId(null);
    setCarrinhoDraft('');
    setLatasDraft('');
    setError(null);
  }, []);

  useEffect(() => {
    resetEdit();
  }, [ordemProducaoId, carrinhos, resetEdit]);

  const iniciarEdicao = (row: FilaFermentacaoCarrinhoRow) => {
    setEditingLogId(row.log_id);
    setCarrinhoDraft(row.carrinho === '—' ? '' : row.carrinho);
    setLatasDraft(String(Math.round(row.latas)));
    setError(null);
  };

  const onSave = async () => {
    if (!editingLogId) return;
    const carrinho = carrinhoDraft.trim();
    if (!carrinho) {
      setError('Informe o número do carrinho.');
      return;
    }
    const latas = Math.round(Number(latasDraft.replace(',', '.')));
    if (!Number.isFinite(latas) || latas < 1 || latas > FERMENTACAO_ASSADEIRAS_MAX) {
      setError(`Informe latas (LT) entre 1 e ${FERMENTACAO_ASSADEIRAS_MAX}.`);
      return;
    }
    setSavingId(editingLogId);
    setError(null);
    try {
      const r = await updateFermentacaoRegistroLog({
        log_id: editingLogId,
        ordem_producao_id: ordemProducaoId,
        numero_carrinho: carrinho,
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
    if (!window.confirm('Excluir este carrinho da fermentação?')) return;
    setDeletingId(logId);
    setError(null);
    try {
      const r = await deleteRegistroEtapaProducao({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      if (editingLogId === logId) resetEdit();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (carrinhos.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 sm:text-xs">Nenhum carrinho registado nesta ordem.</p>
    );
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        Carrinhos registrados
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {carrinhos.map((c) => {
          const editando = editingLogId === c.log_id;
          const bloqueado = c.bloqueado_no_forno === true;
          return (
            <li
              key={c.log_id}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                editando ? 'border-blue-300 bg-blue-50/90' : 'border-slate-200 bg-white'
              }`}
            >
              {editando && !bloqueado ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`fila-ferm-c-${c.log_id}`}>
                      Carrinho
                    </label>
                    <input
                      id={`fila-ferm-c-${c.log_id}`}
                      type="text"
                      inputMode="numeric"
                      value={carrinhoDraft}
                      onChange={(e) => setCarrinhoDraft(e.target.value)}
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                      placeholder="Nº"
                    />
                    <span className="text-slate-500">LT</span>
                    <input
                      type="number"
                      min={1}
                      max={FERMENTACAO_ASSADEIRAS_MAX}
                      value={latasDraft}
                      onChange={(e) => setLatasDraft(e.target.value)}
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={savingId === c.log_id}
                      onClick={() => void onSave()}
                      className="rounded border border-slate-800 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {savingId === c.log_id ? '…' : 'Salvar'}
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
                    rotuloExibicao={c.rotulo_exibicao ?? `Carrinho ${c.carrinho}`}
                    ehRegistroAdiantado={c.eh_registro_adiantado}
                    latas={c.latas}
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {bloqueado ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        No forno
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(c)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === c.log_id || bloqueado}
                      title={bloqueado ? 'Exclua primeiro a entrada no forno' : undefined}
                      onClick={() => void onDelete(c.log_id)}
                      className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === c.log_id ? '…' : 'Excluir'}
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
