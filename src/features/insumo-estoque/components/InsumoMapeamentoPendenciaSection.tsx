'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import InsumoPendenciaMobileList from '@/features/insumo-estoque/components/InsumoPendenciaMobileList';
import InsumoPendenciaTable from '@/features/insumo-estoque/components/InsumoPendenciaTable';

type Props = {
  variant: 'pendente' | 'ignorado';
  filteredGrupos: InsumoPendenciaProdutoGrupo[];
  searchTerm: string;
  onClearSearch: () => void;
  selectedKeys: Set<string>;
  selectedGrupoCount: number;
  selectedPendenciaCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onToggleSelect: (chave: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onVincular: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onIgnorar?: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onRestaurar?: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onBatchSecundario: () => void;
  batchLoading: boolean;
};

export default function InsumoMapeamentoPendenciaSection({
  variant,
  filteredGrupos,
  searchTerm,
  onClearSearch,
  selectedKeys,
  selectedGrupoCount,
  selectedPendenciaCount,
  allVisibleSelected,
  someVisibleSelected,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onVincular,
  onIgnorar,
  onRestaurar,
  onBatchSecundario,
  batchLoading,
}: Props) {
  const isIgnorado = variant === 'ignorado';

  if (filteredGrupos.length === 0) {
    return (
      <EmptyState
        icon={isIgnorado ? 'block' : 'link_off'}
        title={
          searchTerm
            ? isIgnorado
              ? 'Nenhum ignorado encontrado'
              : 'Nenhuma pendência encontrada'
            : isIgnorado
              ? 'Nenhum item ignorado'
              : 'Nenhuma pendência'
        }
        description={
          searchTerm
            ? 'Tente ajustar a busca.'
            : isIgnorado
              ? 'Produtos Omie ignorados aparecerão aqui para revisão.'
              : 'Itens de NF sem vínculo Omie aparecerão aqui para resolução.'
        }
        action={
          searchTerm ? (
            <Button variant="ghost" onClick={onClearSearch}>
              Limpar busca
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {selectedGrupoCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            <span className="font-mono tabular-nums">{selectedGrupoCount}</span>{' '}
            {selectedGrupoCount === 1 ? 'produto' : 'produtos'} •{' '}
            <span className="font-mono tabular-nums">{selectedPendenciaCount}</span>{' '}
            {selectedPendenciaCount === 1 ? 'pendência' : 'pendências'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={batchLoading}>
              Limpar seleção
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={isIgnorado ? 'undo' : 'block'}
              onClick={onBatchSecundario}
              disabled={batchLoading}
            >
              {batchLoading
                ? isIgnorado
                  ? 'Restaurando…'
                  : 'Ignorando…'
                : isIgnorado
                  ? 'Restaurar selecionadas'
                  : 'Ignorar selecionadas'}
            </Button>
          </div>
        </div>
      ) : null}

      <InsumoPendenciaTable
        grupos={filteredGrupos}
        selectedKeys={selectedKeys}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onToggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        onVincular={onVincular}
        onIgnorar={onIgnorar}
        onRestaurar={onRestaurar}
        variant={variant}
        embedded
      />
      <InsumoPendenciaMobileList
        grupos={filteredGrupos}
        selectedKeys={selectedKeys}
        onToggleSelect={onToggleSelect}
        onVincular={onVincular}
        onIgnorar={onIgnorar}
        onRestaurar={onRestaurar}
        variant={variant}
      />
    </>
  );
}
