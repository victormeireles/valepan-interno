import { describe, expect, it, vi } from 'vitest';
import type { InsumoConsumoSemanalItem } from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import type { InsumoConsumoPeriodo } from '@/domain/insumos/insumo-consumo-semanal-periodo';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';

const mockListSaldosComDetalhes = vi.fn<() => Promise<InsumoSaldoComDetalhes[]>>();
const mockListQuantidadesByInsumoIds =
  vi.fn<(insumoIds: string[]) => Promise<Map<string, number>>>();
const mockListConsumoSemanal =
  vi.fn<(periodo: InsumoConsumoPeriodo) => Promise<InsumoConsumoSemanalItem[]>>();
const mockCountPendentes = vi.fn<() => Promise<number>>();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {
    listSaldosComDetalhes: mockListSaldosComDetalhes,
    listQuantidadesByInsumoIds: mockListQuantidadesByInsumoIds,
  },
  InsumoEstoqueRepository: vi.fn(),
}));

vi.mock('@/data/insumos/InsumoConsumoRepository', () => ({
  insumoConsumoRepository: {
    listConsumoSemanal: mockListConsumoSemanal,
  },
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

describe('getInsumoConsumoSemanalPageData', () => {
  it('enriquece os consumos com estoque e cobertura', async () => {
    mockListConsumoSemanal.mockResolvedValue([
      {
        insumoId: 'farinha',
        nome: 'Farinha',
        unidadeResumida: 'KG',
        consumoPorSemana: {
          '2026-06-28': 14,
          '2026-07-05': 28,
          '2026-07-12': 0,
        },
        total: 42,
        receitas: [],
        estoqueAtual: 0,
        media: 0,
        coberturaDias: null,
        pico: 0,
        coberturaPicoDias: null,
      },
    ]);
    mockListQuantidadesByInsumoIds.mockResolvedValue(new Map([['farinha', 42]]));

    const { getInsumoConsumoSemanalPageData } = await import('./insumo-estoque-actions');
    const result = await getInsumoConsumoSemanalPageData({
      dataInicio: '2026-07-01',
      dataFim: '2026-07-14',
      visualizacao: 'semanal',
    });

    expect(mockListQuantidadesByInsumoIds).toHaveBeenCalledWith(['farinha']);
    expect(result.items[0]).toMatchObject({
      estoqueAtual: 42,
      media: 14,
      coberturaDias: 21,
      pico: 28,
      coberturaPicoDias: 11,
    });
  });
});
