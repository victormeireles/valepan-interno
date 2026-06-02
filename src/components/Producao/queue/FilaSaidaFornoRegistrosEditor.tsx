'use client';

import FilaRegistroLinhaLabel from '@/components/Producao/queue/FilaRegistroLinhaLabel';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteRegistroEtapaProducao,
  updateSaidaFornoRegistroLog,
} from '@/app/actions/producao-etapas-actions';
import { MAX_BANDEJAS_SAIDA } from '@/components/Producao/BandejasStepper';
import type { FilaSaidaFornoRegistroRow } from '@/components/Producao/queue/production-queue-types';

type Props = {
  ordemProducaoId: string;
  registros: FilaSaidaFornoRegistroRow[];
  unidadesAssadeira?: number | null;
  onRefresh: () => void;
};

export default function FilaSaidaFornoRegistrosEditor({
  ordemProducaoId,
  registros,
  unidadesAssadeira,
  onRefresh,
}: Props) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [carrinhoDraft, setCarrinhoDraft] = useState('');
  const [bandejasDraft, setBandejasDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetEdit = useCallback(() => {
    setEditingLogId(null);
    setCarrinhoDraft('');
    setBandejasDraft('');
    setError(null);
  }, []);

  useEffect(() => {
    resetEdit();
  }, [ordemProducaoId, registros, resetEdit]);

  const iniciarEdicao = (row: FilaSaidaFornoRegistroRow) => {
    setEditingLogId(row.log_id);
    setCarrinhoDraft(row.carrinho === '—' ? '' : row.carrinho);
    setBandejasDraft(String(Math.max(1, Math.round(row.bandejas))));
    setError(null);
  };

  const onSave = async () => {
    if (!editingLogId) return;
    const carrinho = carrinhoDraft.trim();
    if (!carrinho) {
      setError('Informe o número do carrinho.');
      return;
    }
    const bandejas = Math.round(Number(bandejasDraft.replace(',', '.')));
    if (!Number.isFinite(bandejas) || bandejas < 1 || bandejas > MAX_BANDEJAS_SAIDA) {
      setError(`Informe bandejas (LT) entre 1 e ${MAX_BANDEJAS_SAIDA}.`);
      return;
    }
    setSavingId(editingLogId);
    setError(null);
    try {
      const r = await updateSaidaFornoRegistroLog({
        log_id: editingLogId,
        ordem_producao_id: ordemProducaoId,
        numero_carrinho: carrinho,
        bandejas,
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
    if (!window.confirm('Excluir este lançamento de saída do forno?')) return;
    setDeletingId(logId);
    setError(null);
    try {
      const r = await deleteRegistroEtapaProducao({
        log_id: logId,
        ordem_producao_id: ordemProducaoId,
      });
      if (!r.success) {
        setError(r.error ?? 'Erro ao excluir saída do forno.');
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
        Saídas do forno
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {registros.map((r) => {
          const editando = editingLogId === r.log_id;
          const bloqueado = r.bloqueado_na_embalagem === true;
          return (
            <li
              key={r.log_id}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                editando ? 'border-amber-300 bg-amber-50/90' : 'border-slate-200 bg-white'
              }`}
            >
              {editando && !bloqueado ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`fila-saida-c-${r.log_id}`}>
                      Carrinho
                    </label>
                    <input
                      id={`fila-saida-c-${r.log_id}`}
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
                      max={MAX_BANDEJAS_SAIDA}
                      value={bandejasDraft}
                      onChange={(e) => setBandejasDraft(e.target.value)}
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 tabular-nums"
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
                  <FilaRegistroLinhaLabel
                    rotuloExibicao={r.rotulo_exibicao ?? `Carrinho ${r.carrinho}`}
                    ehRegistroAdiantado={r.eh_registro_adiantado}
                    bandejas={r.bandejas}
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {r.em_andamento ? (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        Em andamento
                      </span>
                    ) : null}
                    {bloqueado ? (
                      <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-900">
                        Na embalagem
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(r)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === r.log_id || bloqueado}
                      title={bloqueado ? 'Exclua primeiro a entrada na embalagem' : undefined}
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
