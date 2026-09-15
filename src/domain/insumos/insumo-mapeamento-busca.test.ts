import { describe, expect, it } from 'vitest';
import {
  InsumoMapeamentoBuscaCoordinator,
  InsumoMapeamentoBuscaEmptyBuilder,
  type MapeamentoBuscaContagens,
} from '@/domain/insumos/insumo-mapeamento-busca';

const coordinator = new InsumoMapeamentoBuscaCoordinator();
const emptyBuilder = new InsumoMapeamentoBuscaEmptyBuilder();

function contagens(
  pendencias: number,
  ignorados: number,
  vinculos: number,
): MapeamentoBuscaContagens {
  return { pendencias, ignorados, vinculos };
}

describe('InsumoMapeamentoBuscaCoordinator', () => {
  it('com busca ativa usa filtrados e lista abas com resultado', () => {
    const resultado = coordinator.build({
      searchActive: true,
      filtrados: contagens(0, 0, 1),
      totais: contagens(12, 3, 40),
    });

    expect(resultado.tabCounts).toEqual(contagens(0, 0, 1));
    expect(resultado.abasComResultado).toEqual(['vinculos']);
  });

  it('sem busca usa totais e abas com total > 0', () => {
    const resultado = coordinator.build({
      searchActive: false,
      filtrados: contagens(0, 0, 0),
      totais: contagens(12, 3, 40),
    });

    expect(resultado.tabCounts).toEqual(contagens(12, 3, 40));
    expect(resultado.abasComResultado).toEqual(['pendencias', 'ignorados', 'vinculos']);
  });
});

describe('InsumoMapeamentoBuscaEmptyBuilder', () => {
  it('sem busca retorna null', () => {
    const resultado = coordinator.build({
      searchActive: false,
      filtrados: contagens(0, 0, 0),
      totais: contagens(12, 3, 40),
    });

    expect(
      emptyBuilder.build({
        searchTerm: '',
        activeTab: 'pendencias',
        resultado,
      }),
    ).toBeNull();
  });

  it('com busca e aba ativa com resultados retorna null', () => {
    const resultado = coordinator.build({
      searchActive: true,
      filtrados: contagens(0, 0, 1),
      totais: contagens(12, 3, 40),
    });

    expect(
      emptyBuilder.build({
        searchTerm: '59016',
        activeTab: 'vinculos',
        resultado,
      }),
    ).toBeNull();
  });

  it('com busca vazia na aba ativa e resultados em outras abas', () => {
    const resultado = coordinator.build({
      searchActive: true,
      filtrados: contagens(0, 0, 1),
      totais: contagens(12, 3, 40),
    });

    const empty = emptyBuilder.build({
      searchTerm: '59016',
      activeTab: 'pendencias',
      resultado,
    });

    expect(empty).toEqual({
      title: 'Nenhum resultado nesta aba.',
      description: '1 em Vínculos',
      atalhos: [{ aba: 'vinculos', label: 'Ir para Vínculos', count: 1 }],
      mostrarLimparBusca: true,
    });
  });

  it('com busca sem match em nenhuma aba', () => {
    const resultado = coordinator.build({
      searchActive: true,
      filtrados: contagens(0, 0, 0),
      totais: contagens(12, 3, 40),
    });

    const empty = emptyBuilder.build({
      searchTerm: 'xyz-inexistente',
      activeTab: 'vinculos',
      resultado,
    });

    expect(empty).toEqual({
      title: 'Nenhum resultado para esta busca.',
      description: 'Tente outro número de NF, produto ou fornecedor.',
      atalhos: [],
      mostrarLimparBusca: true,
    });
  });
});
