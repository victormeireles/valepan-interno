import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const listByDataProducao = vi.fn();
const findByIdsTipos = vi.fn();
const findByIdsProdutos = vi.fn();
const assadeirasIn = vi.fn();
const resolveDefaultForProduto = vi.fn();

vi.mock('@/domain/assadeiras/assadeira-resolver', () => ({
  assadeiraResolver: {
    resolveDefaultForProduto: (...args: unknown[]) => resolveDefaultForProduto(...args),
  },
}));

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: {
    listByDataProducao: (...args: unknown[]) => listByDataProducao(...args),
  },
}));

vi.mock('@/lib/services/tipos-estoque-service', () => ({
  tiposEstoqueService: {
    findByIds: (...args: unknown[]) => findByIdsTipos(...args),
  },
}));

vi.mock('@/lib/services/products/supabase-product-service', () => ({
  SupabaseProductService: class {
    findByIds(...args: unknown[]) {
      return findByIdsProdutos(...args);
    }
  },
}));

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: (...args: unknown[]) => assadeirasIn(...args),
        })),
      })),
    })),
  },
}));

const { ordensProducaoPainelService } = await import('./ordens-producao-painel-service');

function makeOrdem(
  id: string,
  overrides: Partial<OrdemProducaoRecord> = {},
): OrdemProducaoRecord {
  return {
    id,
    createdAt: '2026-06-17T08:00:00Z',
    updatedAt: '2026-06-17T08:00:00Z',
    dataProducao: '2026-06-17',
    dataFabricacaoEtiqueta: '2026-06-18',
    tipoEstoqueId: 'tipo-1',
    produtoId: 'prod-1',
    observacao: '',
    assadeiraId: 'ass-1',
    assadeiras: 12,
    ordemPlanejamento: 1,
    quantidade: { caixas: 20, pacotes: 0, unidades: 480, kg: 0 },
    ...overrides,
  };
}

describe('OrdensProducaoPainelService.getListForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveDefaultForProduto.mockImplementation(async (produtoId: string) => {
      if (produtoId === 'prod-1') {
        return { assadeira_id: 'ass-1', assadeira_nome: 'Lata 40', unidades_efetivas: 40 };
      }
      return null;
    });
    findByIdsTipos.mockResolvedValue([
      {
        id: 'tipo-1',
        nome: 'Valepan',
        ativo: true,
        possuiEtiqueta: true,
        congelado: false,
        mostrarTextoCongelado: false,
      },
    ]);
    findByIdsProdutos.mockResolvedValue([
      {
        id: 'prod-1',
        nome: 'HB Brioche 65g',
        unidadeNomeResumido: 'UN',
        codigo: 'HB65',
        unitBarcode: null,
        boxUnits: 24,
        packageUnits: null,
        unitWeight: null,
        unidadesAssadeira: 40,
      },
      {
        id: 'prod-2',
        nome: 'Baguete',
        unidadeNomeResumido: 'UN',
        codigo: 'BG',
        unitBarcode: null,
        boxUnits: null,
        packageUnits: null,
        unitWeight: null,
        unidadesAssadeira: null,
      },
    ]);
    assadeirasIn.mockResolvedValue({
      data: [{ id: 'ass-1', nome: 'Lata 40' }],
      error: null,
    });
  });

  it('retorna lista vazia e resumo zerado', async () => {
    listByDataProducao.mockResolvedValue([]);

    const result = await ordensProducaoPainelService.getListForDate('2026-06-17');

    expect(result).toEqual({
      date: '2026-06-17',
      resumo: { totalOrdens: 0, totalLatas: 0, totalUnidades: 0 },
      ordens: [],
    });
    expect(findByIdsTipos).not.toHaveBeenCalled();
    expect(findByIdsProdutos).not.toHaveBeenCalled();
    expect(assadeirasIn).not.toHaveBeenCalled();
  });

  it('mapeia ordem com latas e label derivado', async () => {
    listByDataProducao.mockResolvedValue([makeOrdem('op-1')]);

    const result = await ordensProducaoPainelService.getListForDate('2026-06-17');

    expect(result.ordens).toHaveLength(1);
    expect(result.ordens[0]).toMatchObject({
      id: 'op-1',
      ordemPlanejamento: 1,
      tipoEstoque: 'Valepan',
      produto: 'HB Brioche 65g',
      modoQuantidade: 'latas',
      assadeiras: 12,
      assadeiraNome: 'Lata 40',
      assadeiraVariant: 'padrao',
      unidades: 480,
      caixas: 20,
      quantidadeLabel: '12 LT → 480 UN • 20 CX',
    });
  });

  it('mapeia ordem sem assadeira em modo unidades', async () => {
    listByDataProducao.mockResolvedValue([
      makeOrdem('op-2', {
        assadeiraId: '',
        assadeiras: 0,
        produtoId: 'prod-2',
        ordemPlanejamento: 2,
        quantidade: { caixas: 41, pacotes: 0, unidades: 1000, kg: 0 },
      }),
    ]);

    const result = await ordensProducaoPainelService.getListForDate('2026-06-17');

    expect(result.ordens[0]).toMatchObject({
      modoQuantidade: 'unidades',
      assadeiras: 0,
      assadeiraNome: undefined,
      assadeiraVariant: 'sem',
      quantidadeLabel: '1000 UN • 41 CX',
    });
    expect(assadeirasIn).not.toHaveBeenCalled();
  });

  it('preserva ordem por ordemPlanejamento e calcula resumo', async () => {
    listByDataProducao.mockResolvedValue([
      makeOrdem('op-1', { ordemPlanejamento: 1, assadeiras: 12, quantidade: { caixas: 20, pacotes: 0, unidades: 480, kg: 0 } }),
      makeOrdem('op-2', {
        id: 'op-2',
        ordemPlanejamento: 2,
        assadeiraId: '',
        assadeiras: 0,
        produtoId: 'prod-2',
        quantidade: { caixas: 0, pacotes: 0, unidades: 500, kg: 0 },
      }),
      makeOrdem('op-3', {
        id: 'op-3',
        ordemPlanejamento: 3,
        assadeiras: 8,
        quantidade: { caixas: 10, pacotes: 0, unidades: 320, kg: 0 },
      }),
    ]);

    const result = await ordensProducaoPainelService.getListForDate('2026-06-17');

    expect(result.ordens.map((o) => o.id)).toEqual(['op-1', 'op-2', 'op-3']);
    expect(result.resumo).toEqual({
      totalOrdens: 3,
      totalLatas: 20,
      totalUnidades: 1300,
    });
  });

  it('marca assadeira alternativa quando difere da padrao', async () => {
    listByDataProducao.mockResolvedValue([
      makeOrdem('op-alt', { assadeiraId: 'ass-2', assadeiras: 10 }),
    ]);
    assadeirasIn.mockResolvedValue({
      data: [
        { id: 'ass-1', nome: 'Lata 40' },
        { id: 'ass-2', nome: 'Lata nova' },
      ],
      error: null,
    });

    const result = await ordensProducaoPainelService.getListForDate('2026-06-17');

    expect(result.ordens[0]).toMatchObject({
      assadeiraNome: 'Lata nova',
      assadeiraVariant: 'alternativa',
    });
  });
});
