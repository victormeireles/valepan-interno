import { describe, expect, it, vi } from 'vitest';
import type { InsumoConsumoSemanalItem } from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import type { InsumoRegraCompraComInsumo } from '@/data/insumos/InsumoRegraCompraRepository';
import { InsumoCompraSugestaoService } from './insumo-compra-sugestao-service';

vi.mock('@/data/insumos/InsumoConsumoRepository', () => ({
  insumoConsumoRepository: {},
  InsumoConsumoRepository: vi.fn(),
}));
vi.mock('@/data/insumos/InsumoDistribuidorRepository', () => ({
  insumoDistribuidorRepository: {},
  InsumoDistribuidorRepository: vi.fn(),
}));
vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {},
  InsumoEstoqueRepository: vi.fn(),
}));
vi.mock('@/data/insumos/InsumoRegraCompraRepository', () => ({
  insumoRegraCompraRepository: {},
  InsumoRegraCompraRepository: vi.fn(),
}));

const periodo = {
  dataInicio: '2026-07-12',
  dataFim: '2026-08-08',
  visualizacao: 'semanal' as const,
  colunas: [
    { inicio: '2026-07-12', fim: '2026-07-18', label: '12/07 a 18/07' },
    { inicio: '2026-07-19', fim: '2026-07-25', label: '19/07 a 25/07' },
  ],
};

function createConsumo(
  insumoId: string,
  nome: string,
  consumos: number[],
): InsumoConsumoSemanalItem {
  return {
    insumoId,
    nome,
    unidadeResumida: 'kg',
    consumoPorSemana: Object.fromEntries(
      periodo.colunas.map((coluna, index) => [coluna.inicio, consumos[index] ?? 0]),
    ),
    total: consumos.reduce((total, consumo) => total + consumo, 0),
    receitas: [],
    estoqueAtual: 0,
    media: 0,
    coberturaDias: null,
    pico: 0,
    coberturaPicoDias: null,
  };
}

function createRegra(
  insumoId: string,
  nome: string,
  overrides: Partial<InsumoRegraCompraComInsumo> = {},
): InsumoRegraCompraComInsumo {
  return {
    insumo_id: insumoId,
    lead_time_dias: 3,
    janela_tipo: 'qualquer',
    dias_semana: null,
    quantidade_minima: null,
    quantidade_maxima: null,
    ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    nome,
    unidade: 'kg',
    ...overrides,
  };
}

function createService(input: {
  consumos: InsumoConsumoSemanalItem[];
  regras: InsumoRegraCompraComInsumo[];
  estoques: Record<string, number>;
  distribuidores?: Array<{
    id: string;
    insumo_id: string;
    nome: string;
    preferencial: boolean;
    ordem: number;
    created_at: string;
  }>;
}) {
  const consumoRepository = {
    listConsumoSemanal: vi.fn().mockResolvedValue(input.consumos),
  };
  const regraRepository = {
    listAllWithInsumo: vi.fn().mockResolvedValue(input.regras),
  };
  const estoqueRepository = {
    listQuantidadesByInsumoIds: vi.fn().mockResolvedValue(new Map(Object.entries(input.estoques))),
  };
  const distribuidorRepository = {
    listByInsumoIds: vi.fn().mockResolvedValue(input.distribuidores ?? []),
  };
  const periodoBuilder = {
    buildDefault: vi.fn().mockReturnValue(periodo),
  };

  return {
    service: new InsumoCompraSugestaoService({
      consumoRepository,
      regraRepository,
      estoqueRepository,
      distribuidorRepository,
      periodoBuilder,
    }),
    periodoBuilder,
  };
}

describe('InsumoCompraSugestaoService', () => {
  it('inclui regra ativa sem consumo como sem_consumo', async () => {
    const { service } = createService({
      consumos: [],
      regras: [createRegra('farinha', 'Farinha')],
      estoques: { farinha: 25 },
    });

    const pageData = await service.buildPageData('2026-08-12');

    expect(pageData.itens).toEqual([
      expect.objectContaining({
        insumoId: 'farinha',
        consumoDiario: 0,
        estoque: 25,
        status: 'sem_consumo',
      }),
    ]);
  });

  it('calcula sugestões, resumo, fornecedores e prioridade', async () => {
    const { service, periodoBuilder } = createService({
      consumos: [
        createConsumo('sem-regra', 'Açúcar', [14, 14]),
        createConsumo('urgente', 'Farinha', [70, 70]),
        createConsumo('ok', 'Fermento', [7, 7]),
        createConsumo('ignorado', 'Água', [100, 100]),
      ],
      regras: [
        createRegra('urgente', 'Farinha'),
        createRegra('ok', 'Fermento'),
        createRegra('sem-consumo', 'Óleo'),
        createRegra('inativa', 'Leite', { ativo: false }),
      ],
      estoques: { 'sem-regra': 10, urgente: 10, ok: 100, 'sem-consumo': 20 },
      distribuidores: [
        {
          id: 'dist-1',
          insumo_id: 'urgente',
          nome: 'Fornecedor A',
          preferencial: true,
          ordem: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'dist-2',
          insumo_id: 'urgente',
          nome: 'Fornecedor B',
          preferencial: false,
          ordem: 1,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const pageData = await service.buildPageData('2026-08-12');

    expect(pageData.dataReferencia).toBe('2026-08-12');
    expect(periodoBuilder.buildDefault).toHaveBeenCalledWith(
      new Date('2026-08-12T12:00:00-03:00'),
      'semanal',
    );
    expect(pageData.itens.map((item) => [item.insumoId, item.status])).toEqual([
      ['urgente', 'urgente'],
      ['sem-consumo', 'sem_consumo'],
      ['ok', 'ok'],
      ['sem-regra', 'sem_regra'],
    ]);
    expect(pageData.resumo).toEqual({
      urgentes: 1,
      pedirHoje: 0,
      foraJanela: 0,
      adiarMin: 0,
    });
    expect(pageData.itens[0]).toEqual(
      expect.objectContaining({
        consumoDiario: 70 / 5.5,
        // cobertura: estoque 10, r≈12.727, ref 2026-08-12 = quarta (3)
        // qua consome 10 → 10/12.727 ≈ 0.7857 d
        coberturaAtualDias: expect.closeTo(10 / (70 / 5.5), 5),
        distribuidorPreferencial: 'Fornecedor A',
        distribuidoresAlternativos: ['Fornecedor B'],
      }),
    );
    expect(pageData.gruposPorFornecedor.map((grupo) => grupo.fornecedor)).toEqual([
      'Fornecedor A',
      'Sem fornecedor',
    ]);
  });
});
