'use client';

import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import NumberDecimalInput from '@/components/FormControls/NumberDecimalInput';
import type { ReceitaImportLinhaRevisao } from '@/domain/receitas/receita-planilha-types';

type Props = {
  rows: ReceitaImportLinhaRevisao[];
  usedInsumoIds: string[];
  onChange: (rows: ReceitaImportLinhaRevisao[]) => void;
  onConfirm: () => void;
  onBack: () => void;
};

function statusLabel(row: ReceitaImportLinhaRevisao): { text: string; icon: string; className: string } {
  if (row.skippedDuplicate) {
    return {
      text: 'Duplicado — ignorado',
      icon: 'info',
      className: 'bg-stone-100 text-stone-600',
    };
  }
  if (row.status === 'matched') {
    return { text: 'Encontrado', icon: 'check_circle', className: 'bg-emerald-50 text-emerald-700' };
  }
  if (row.status === 'review') {
    return { text: 'Revisar', icon: 'warning', className: 'bg-amber-50 text-amber-800' };
  }
  return { text: 'Não encontrado', icon: 'help_outline', className: 'bg-rose-50 text-rose-700' };
}

function updateRow(
  rows: ReceitaImportLinhaRevisao[],
  rowId: string,
  patch: Partial<ReceitaImportLinhaRevisao>,
): ReceitaImportLinhaRevisao[] {
  return rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
}

export default function ReceitaImportMatchReview({
  rows,
  usedInsumoIds,
  onChange,
  onConfirm,
  onBack,
}: Props) {
  const activeRows = rows.filter((row) => !row.skippedDuplicate);
  const canConfirm = activeRows.every((row) => Boolean(row.insumoId));

  const handleInsumoChange = (rowId: string, insumoId: string, nome: string, unidade: string | null) => {
    if (insumoId) {
      const duplicateInRows = rows.some(
        (entry) => entry.id !== rowId && entry.insumoId === insumoId && !entry.skippedDuplicate,
      );
      const duplicateInRecipe = usedInsumoIds.includes(insumoId);
      if (duplicateInRows || duplicateInRecipe) {
        return;
      }
    }

    const next = updateRow(rows, rowId, {
      insumoId: insumoId || null,
      insumoNome: nome || null,
      unidadeDescricao: unidade,
      status: insumoId ? 'matched' : 'not_found',
      score: insumoId ? 1 : null,
    });
    onChange(next);
  };

  const handleQuantidadeChange = (rowId: string, quantidade: number) => {
    onChange(updateRow(rows, rowId, { quantidade }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Revise os matches antes de importar. Linhas sem insumo precisam de seleção manual.
      </p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {rows.map((row) => {
          const badge = statusLabel(row);

          return (
            <div
              key={row.id}
              className={`rounded-xl border p-4 space-y-3 ${
                row.skippedDuplicate ? 'border-stone-100 bg-stone-50/50 opacity-70' : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-900">{row.nomeColado}</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${badge.className}`}
                >
                  <span className="material-icons text-sm" aria-hidden>
                    {badge.icon}
                  </span>
                  {badge.text}
                </span>
              </div>

              {!row.skippedDuplicate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectRemoteAutocomplete
                    value={row.insumoId ?? ''}
                    onChange={(value) => {
                      if (!value) {
                        handleInsumoChange(row.id, '', '', null);
                        return;
                      }
                    }}
                    stage="insumos"
                    placeholder="Selecione o insumo..."
                    label="Insumo"
                    required={false}
                    onOptionSelected={(option) => {
                      const meta = option?.meta as Record<string, string> | undefined;
                      handleInsumoChange(
                        row.id,
                        option?.value ?? '',
                        option?.label?.replace(/\s*\([^)]+\)$/, '') ?? '',
                        meta?.unidadeNomeResumido ?? meta?.unidade_nome_resumido ?? null,
                      );
                    }}
                  />
                  <NumberDecimalInput
                    label={`Quantidade${row.unidadeDescricao ? ` (${row.unidadeDescricao})` : ''}`}
                    value={row.quantidade}
                    onChange={(value) => handleQuantidadeChange(row.id, value)}
                    min={0}
                    step={0.001}
                    placeholder="Ex: 0,300"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-100 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="flex-[2] px-4 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar importação
        </button>
      </div>
    </div>
  );
}
