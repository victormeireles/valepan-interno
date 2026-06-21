'use client';

import { Button } from '@/components/ui/Button';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';

type OrdensProducaoBulkBarProps = {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onMoveToTop: () => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
  showSelectAll?: boolean;
};

export default function OrdensProducaoBulkBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onMoveToTop,
  onDelete,
  onClear,
  busy = false,
  showSelectAll = false,
}: OrdensProducaoBulkBarProps) {
  if (selectedCount === 0 && !showSelectAll) {
    return null;
  }

  const selectionLabel =
    selectedCount === 1 ? '1 ordem selecionada' : `${selectedCount} ordens selecionadas`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200/80 bg-amber-50/80 px-3 py-2.5 sm:px-4">
      {showSelectAll ? (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <OrdemProducaoRowCheckbox
            checked={allSelected}
            onChange={onToggleAll}
            ariaLabel="Selecionar todas as ordens"
          />
          <span>
            {selectedCount > 0 ? selectionLabel : `Selecionar todas (${totalCount})`}
          </span>
        </label>
      ) : (
        <p className="text-sm font-medium text-amber-950">{selectionLabel}</p>
      )}

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon="vertical_align_top"
            disabled={busy}
            onClick={onMoveToTop}
          >
            Mover para o topo
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon="delete"
            disabled={busy}
            onClick={onDelete}
          >
            Excluir
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClear}>
            Limpar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
