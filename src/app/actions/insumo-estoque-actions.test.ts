import { describe, expect, it, vi } from 'vitest';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';

const mockListSaldosComDetalhes = vi.fn<() => Promise<InsumoSaldoComDetalhes[]>>();
const mockCountPendentes = vi.fn<() => Promise<number>>();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {
    listSaldosComDetalhes: mockListSaldosComDetalhes,
  },
  InsumoEstoqueRepository: vi.fn(),
}));

vi.mock('@/data/insumos/InsumoPendenciaRepository', () => ({
  insumoPendenciaRepository: {
    countPendentes: mockCountPendentes,
  },
}));

vi.mock('@/data/insumos/InsumoMapeamentoRepository', () => ({
  insumoMapeamentoRepository: {},
}));

vi.mock('@/lib/services/insumo-estoque-service', () => ({
  insumoEstoqueService: {},
}));

vi.mock('@/lib/services/insumo-vinculo-lote-applier', () => ({
  insumoVinculoLoteApplier: {},
}));

vi.mock('@/lib/services/insumo-entrada-fator-recalc-integracao-service', () => ({
  insumoEntradaFatorRecalcIntegracaoService: {},
}));

function buildSaldo(nome: string): InsumoSaldoComDetalhes {
  return {
    insumoId: nome.toLowerCase(),
    nome,
    unidadeResumida: 'UN',
    quantidade: 10,
    custoUnitario: 1,
    ultimaEntradaEm: null,
  };
}

describe('getInsumoSaldosPageData', () => {
  it('remove agua e gelo da listagem de estoque de insumos', async () => {
    mockListSaldosComDetalhes.mockResolvedValue([
      buildSaldo('Farinha'),
      buildSaldo('Água'),
      buildSaldo('Gelo'),
      buildSaldo('Fermento'),
    ]);
    mockCountPendentes.mockResolvedValue(2);

    const { getInsumoSaldosPageData } = await import('./insumo-estoque-actions');

    const result = await getInsumoSaldosPageData();

    expect(result.saldos.map((saldo) => saldo.nome)).toEqual(['Farinha', 'Fermento']);
    expect(result.pendenciasCount).toBe(2);
  });
});
