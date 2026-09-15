import { useMemo } from 'react';
import {
  InsumoMapeamentoBuscaCoordinator,
  InsumoMapeamentoBuscaEmptyBuilder,
  type MapeamentoAbaId,
  type MapeamentoBuscaEmptyModel,
  type MapeamentoBuscaResultado,
} from '@/domain/insumos/insumo-mapeamento-busca';
import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

const buscaCoordinator = new InsumoMapeamentoBuscaCoordinator();
const emptyBuilder = new InsumoMapeamentoBuscaEmptyBuilder();

type Input = {
  activeTab: MapeamentoAbaId;
  searchTerm: string;
  filteredGrupos: InsumoPendenciaProdutoGrupo[];
  filteredIgnoradaGrupos: InsumoPendenciaProdutoGrupo[];
  filteredVinculos: IntegracaoInsumoListItem[];
  pendenciasCount: number;
  ignoradasCount: number;
  vinculosCount: number;
};

type Output = {
  searchActive: boolean;
  buscaResultado: MapeamentoBuscaResultado;
  emptyModel: MapeamentoBuscaEmptyModel | null;
  tabCounts: MapeamentoBuscaResultado['tabCounts'];
  summaryLabel: string;
};

function buildSummaryLabel(input: {
  activeTab: MapeamentoAbaId;
  searchActive: boolean;
  filteredGrupos: number;
  filteredIgnorados: number;
  filteredVinculos: number;
  pendenciasCount: number;
  ignoradasCount: number;
  vinculosCount: number;
}): string {
  if (input.activeTab === 'vinculos') {
    const total = input.searchActive ? input.filteredVinculos : input.vinculosCount;
    return total === 1 ? '1 produto vinculado' : `${total} produtos vinculados`;
  }

  if (input.activeTab === 'ignorados') {
    if (input.searchActive) {
      return input.filteredIgnorados === 1
        ? '1 produto'
        : `${input.filteredIgnorados} produtos`;
    }
    return input.filteredIgnorados === 1
      ? `1 produto • ${input.ignoradasCount} ignoradas`
      : `${input.filteredIgnorados} produtos • ${input.ignoradasCount} ignoradas`;
  }

  if (input.searchActive) {
    return input.filteredGrupos === 1
      ? '1 produto'
      : `${input.filteredGrupos} produtos`;
  }

  return input.filteredGrupos === 1
    ? `1 produto • ${input.pendenciasCount} pendências`
    : `${input.filteredGrupos} produtos • ${input.pendenciasCount} pendências`;
}

export function useInsumoMapeamentoBuscaViewModel(input: Input): Output {
  return useMemo(() => {
    const searchActive = Boolean(input.searchTerm.trim());
    const filtrados = {
      pendencias: input.filteredGrupos.length,
      ignorados: input.filteredIgnoradaGrupos.length,
      vinculos: input.filteredVinculos.length,
    };
    const totais = {
      pendencias: input.pendenciasCount,
      ignorados: input.ignoradasCount,
      vinculos: input.vinculosCount,
    };
    const buscaResultado = buscaCoordinator.build({
      searchActive,
      filtrados,
      totais,
    });
    const emptyModel = emptyBuilder.build({
      searchTerm: input.searchTerm,
      activeTab: input.activeTab,
      resultado: buscaResultado,
    });

    return {
      searchActive,
      buscaResultado,
      emptyModel,
      tabCounts: buscaResultado.tabCounts,
      summaryLabel: buildSummaryLabel({
        activeTab: input.activeTab,
        searchActive,
        filteredGrupos: filtrados.pendencias,
        filteredIgnorados: filtrados.ignorados,
        filteredVinculos: filtrados.vinculos,
        pendenciasCount: input.pendenciasCount,
        ignoradasCount: input.ignoradasCount,
        vinculosCount: input.vinculosCount,
      }),
    };
  }, [
    input.activeTab,
    input.searchTerm,
    input.filteredGrupos,
    input.filteredIgnoradaGrupos,
    input.filteredVinculos,
    input.pendenciasCount,
    input.ignoradasCount,
    input.vinculosCount,
  ]);
}
