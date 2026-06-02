'use client';

import { useState } from 'react';
import type { OrdemProducaoDiariaItemView, ClienteOrdemProducaoOpcao } from '@/app/actions/producao-actions';
import type { TipoCaixaOrdemOpcao } from '@/app/actions/tipos-caixa-embalagem-actions';
import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';
import OrdemProducaoRow from './OrdemProducaoRow';
import type { OrdemDividirParte } from './OrdemProducaoDividirModal';
import OrdemProducaoSumBar from './OrdemProducaoSumBar';
import { useOrdemProducaoCellSelection } from './useOrdemProducaoCellSelection';

interface OrdemProducaoGridProps {
  items: OrdemProducaoDiariaItemView[];
  /** Cabeçalho da ordem diária (para `removeOrdemProducaoDiariaItem`). Vazio em modo pré-visualização. */
  ordemDiariaId: string;
  tiposCaixaOpcoes: TipoCaixaOrdemOpcao[];
  clientesOrdemOpcoes: ClienteOrdemProducaoOpcao[];
  onRemoveLineResult: (message: string | null) => void;
  /** Ajusta a mensagem da tabela vazia (ex.: esqueleto sem migração). */
  previewMode?: boolean;
  onSaveRow: (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoLataSelecao;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacaoEmbalagem?: string | null;
    observacaoProducao?: string | null;
    tipoCaixaEmbalagemId?: string | null;
  }) => Promise<boolean>;
  savingItemId: string | null;
  /** Reordenar por arrastar-soltar (prioridade). `placeBefore` indica inserir antes/depois do alvo. */
  onReorderDrag: (
    sourceItemId: string,
    targetItemId: string,
    placeBefore: boolean,
  ) => Promise<boolean>;
  /** Dividir uma ordem em duas (parte 1 atualiza a original; parte 2 vira novo item). */
  onDividirItem: (
    itemId: string,
    parte1: OrdemDividirParte,
    parte2: OrdemDividirParte,
  ) => Promise<boolean>;
}

export default function OrdemProducaoGrid({
  items,
  ordemDiariaId,
  tiposCaixaOpcoes,
  clientesOrdemOpcoes,
  onRemoveLineResult,
  previewMode = false,
  onSaveRow,
  savingItemId,
  onReorderDrag,
  onDividirItem,
}: OrdemProducaoGridProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState(true);
  const [reorderBusy, setReorderBusy] = useState(false);
  const emptyMsg = previewMode ? 'Pré-visualização — sem dados.' : 'Sem itens.';

  /** Posição (1-based) que a linha arrastada assumirá ao soltar sobre `targetId`. */
  const calcularNovaPosicao = (targetId: string, before: boolean): number | null => {
    if (!draggingItemId || draggingItemId === targetId) return null;
    const semOrigem = items.map((r) => r.id).filter((id) => id !== draggingItemId);
    const targetIdx = semOrigem.indexOf(targetId);
    if (targetIdx < 0) return null;
    const insertIdx = before ? targetIdx : targetIdx + 1;
    return insertIdx + 1;
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
        {emptyMsg}
      </div>
    );
  }

  const editLockActive = editingItemId !== null;
  const dragEnabled =
    !previewMode && !editLockActive && savingItemId === null && !reorderBusy;
  const selectionEnabled = !previewMode && !editLockActive && savingItemId === null;
  const cellSelection = useOrdemProducaoCellSelection(items, selectionEnabled);

  type SavePayload = Parameters<OrdemProducaoGridProps['onSaveRow']>[0];
  const handleSaveRowAndExit = async (payload: SavePayload) => {
    const ok = await onSaveRow(payload);
    if (ok) setEditingItemId(null);
    return ok;
  };

  return (
    <div className="space-y-2">
          {editLockActive ? (
        <p className="text-xs text-slate-600">
          Uma linha em edição —{' '}
          <button
            type="button"
            className="font-medium text-slate-800 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-700"
            onClick={() => setEditingItemId(null)}
          >
            cancelar edição
          </button>{' '}
          para voltar ao modo compacto, arrastar linhas ou gravar.
        </p>
      ) : null}
      {selectionEnabled ? (
        <p className="text-[11px] leading-snug text-slate-500">
          <span className="font-medium text-slate-600">Somar como no Excel:</span> clique em latas ou caixas ·{' '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px]">Ctrl</kbd> várias
          células · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px]">Shift</kbd>{' '}
          intervalo na mesma coluna · arrastar para baixo na coluna.
        </p>
      ) : null}
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1080px] w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <th className="min-w-[4.5rem] px-2 py-3 text-center">
                <span className="block">Prioridade</span>
                <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                  Arrastar ícone
                </span>
              </th>
              <th className="px-2 py-3">Produto</th>
              <th className="px-2 py-3">Lata</th>
              <th className="px-2 py-3 max-w-[16rem]">Tipo de caixa</th>
              <th className="px-2 py-3">
                Latas planejadas
                {selectionEnabled ? (
                  <span className="mt-0.5 block text-[10px] font-normal normal-case text-sky-700">
                    Selecionável
                  </span>
                ) : null}
              </th>
              <th className="px-2 py-3">
                Caixas estimadas
                {selectionEnabled ? (
                  <span className="mt-0.5 block text-[10px] font-normal normal-case text-sky-700">
                    Selecionável
                  </span>
                ) : null}
              </th>
              <th className="min-w-[11rem] max-w-[14rem] px-2 py-3">Cliente</th>
              <th className="px-2 py-3 max-w-[12rem]">Obs. embalagem</th>
              <th className="px-2 py-3 max-w-[12rem]">Obs. produção</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <OrdemProducaoRow
                key={item.id}
                item={item}
                ordemDiariaId={ordemDiariaId}
                tiposCaixaOpcoes={tiposCaixaOpcoes}
                clientesOrdemOpcoes={clientesOrdemOpcoes}
                onRemoveLineResult={onRemoveLineResult}
                onSave={handleSaveRowAndExit}
                saving={savingItemId === item.id}
                isEditing={editingItemId === item.id}
                onStartEdit={() => setEditingItemId(item.id)}
                onCancelEdit={() => setEditingItemId(null)}
                editBlockedOnAnotherRow={editLockActive && editingItemId !== item.id}
                onDividir={(parte1, parte2) => onDividirItem(item.id, parte1, parte2)}
                cellSelection={cellSelection}
                dragRow={
                  dragEnabled
                    ? {
                        isDragging: draggingItemId === item.id,
                        dropIndicator:
                          dragOverItemId === item.id && draggingItemId !== item.id
                            ? dropBefore
                              ? 'before'
                              : 'after'
                            : null,
                        novaPosicao:
                          dragOverItemId === item.id && draggingItemId !== item.id
                            ? calcularNovaPosicao(item.id, dropBefore)
                            : null,
                        onHandleDragStart: (e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/x-valepan-ordem-item', item.id);
                          e.dataTransfer.setData('text/plain', item.id);
                          setDraggingItemId(item.id);
                        },
                        onHandleDragEnd: () => {
                          setDraggingItemId(null);
                          setDragOverItemId(null);
                        },
                        onDragOver: (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (draggingItemId === item.id) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const before = e.clientY - rect.top < rect.height / 2;
                          if (dragOverItemId !== item.id) setDragOverItemId(item.id);
                          if (dropBefore !== before) setDropBefore(before);
                        },
                        onDragLeave: (e) => {
                          // Só limpa se o ponteiro saiu de fato da linha (evita flicker entre células).
                          const related = e.relatedTarget as Node | null;
                          if (related && e.currentTarget.contains(related)) return;
                          if (dragOverItemId === item.id) setDragOverItemId(null);
                        },
                        onDrop: async (e) => {
                          e.preventDefault();
                          const src =
                            e.dataTransfer.getData('application/x-valepan-ordem-item') ||
                            e.dataTransfer.getData('text/plain');
                          const before = dropBefore;
                          setDraggingItemId(null);
                          setDragOverItemId(null);
                          if (!src || src === item.id) return;
                          const ids = items.map((r) => r.id);
                          if (ids.indexOf(src) < 0 || ids.indexOf(item.id) < 0) return;
                          setReorderBusy(true);
                          try {
                            await onReorderDrag(src, item.id, before);
                          } finally {
                            setReorderBusy(false);
                          }
                        },
                      }
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
        <OrdemProducaoSumBar selection={cellSelection} />
      </div>
    </div>
  );
}
