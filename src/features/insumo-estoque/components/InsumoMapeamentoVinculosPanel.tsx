'use client';

import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';
import type { MapeamentoBuscaEmptyModel } from '@/domain/insumos/insumo-mapeamento-busca';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import InsumoMapeamentoBuscaEmptyState from '@/features/insumo-estoque/components/InsumoMapeamentoBuscaEmptyState';
import InsumoVinculoMobileList from '@/features/insumo-estoque/components/InsumoVinculoMobileList';
import InsumoVinculoTable from '@/features/insumo-estoque/components/InsumoVinculoTable';

type Props = {
  items: IntegracaoInsumoListItem[];
  searchTerm: string;
  buscaEmptyModel: MapeamentoBuscaEmptyModel | null;
  onClearSearch: () => void;
  onGoToTab: (aba: MapeamentoAbaId) => void;
  onEditar: (item: IntegracaoInsumoListItem) => void;
  onExcluir: (item: IntegracaoInsumoListItem) => void;
};

export default function InsumoMapeamentoVinculosPanel({
  items,
  searchTerm,
  buscaEmptyModel,
  onClearSearch,
  onGoToTab,
  onEditar,
  onExcluir,
}: Props) {
  if (items.length === 0) {
    if (buscaEmptyModel) {
      return (
        <InsumoMapeamentoBuscaEmptyState
          model={buscaEmptyModel}
          onGoToTab={onGoToTab}
          onClearSearch={onClearSearch}
        />
      );
    }

    return (
      <EmptyState
        icon="link"
        title={searchTerm ? 'Nenhum vínculo encontrado' : 'Nenhum vínculo cadastrado'}
        description={
          searchTerm
            ? 'Tente ajustar a busca.'
            : 'Produtos Omie vinculados a insumos aparecerão aqui para revisão.'
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
      <InsumoVinculoTable
        items={items}
        onEditar={onEditar}
        onExcluir={onExcluir}
        embedded
      />
      <InsumoVinculoMobileList
        items={items}
        onEditar={onEditar}
        onExcluir={onExcluir}
      />
    </>
  );
}
