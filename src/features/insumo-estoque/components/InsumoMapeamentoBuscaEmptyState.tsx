'use client';

import type { MapeamentoBuscaEmptyModel } from '@/domain/insumos/insumo-mapeamento-busca';
import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type Props = {
  model: MapeamentoBuscaEmptyModel;
  onGoToTab: (aba: MapeamentoAbaId) => void;
  onClearSearch: () => void;
};

export default function InsumoMapeamentoBuscaEmptyState({
  model,
  onGoToTab,
  onClearSearch,
}: Props) {
  return (
    <EmptyState
      icon="search_off"
      title={model.title}
      description={model.description}
      action={
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {model.atalhos.map((atalho) => (
            <Button
              key={atalho.aba}
              variant="secondary"
              onClick={() => onGoToTab(atalho.aba)}
            >
              {atalho.label}
            </Button>
          ))}
          {model.mostrarLimparBusca ? (
            <Button variant="ghost" onClick={onClearSearch}>
              Limpar busca
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
