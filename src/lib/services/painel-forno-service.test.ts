import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const listByDataProducao = vi.fn();
const listByDatasProducao = vi.fn();
const findUltimaDataComPedidos = vi.fn();
const findDataAnteriorComPedidos = vi.fn();
const listByOrdemProducaoIds = vi.fn();
const findByIdsTipos = vi.fn();
const findByIdsProdutos = vi.fn();
const assadeirasIn = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: {
    listByDataProducao: (...args: unknown[]) => listByDataProducao(...args),
    listByDatasProducao: (...args: unknown[]) => listByDatasProducao(...args),
    findUltimaDataComPedidos: (...args: unknown[]) => findUltimaDataComPedidos(...args),
    findDataAnteriorComPedidos: (...args: unknown[]) => findDataAnteriorComPedidos(...args),
  },
}));

vi.mock('@/data/producao-etapa/FornoLoteRepository', () => ({
  fornoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => listByOrdemProducaoIds(...args),
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

const { painelFornoService } = await import('./painel-forno-service');

function makeOrdem(id: string): OrdemProducaoRecord {
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
    assadeiras: 10,
    ordemPlanejamento: 1,
    quantidade: { caixas: 0, pacotes: 0, unidades: 240, kg: 0 },
  };
}

function makeLote(id: string, assadeiras: number): FornoLoteRecord {
  return {
    id,
    createdAt: '2026-06-17T10:00:00Z',
    modo: 'parcial',
    ordemProducaoId: 'op-1',
    assadeiras,
    unidades: 0,
    produzidoEm: '2026-06-17T10:00:00Z',
  };
}

describe('PainelFornoService.getPainelForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    ]);
    assadeirasIn.mockResolvedValue({
      data: [{ id: 'ass-1', nome: 'Lata 40' }],
      error: null,
    });
  });

  it('retorna ordens vazias quando não há ordens', async () => {
    listByDataProducao.mockResolvedValue([]);

    const result = await painelFornoService.getPainelForDate('2026-06-17');

    expect(result).toEqual({ date: '2026-06-17', ordens: [] });
    expect(listByOrdemProducaoIds).not.toHaveBeenCalled();
  });

  it('agrega 1 ordem com 2 lotes e resolve nomes', async () => {
    listByDataProducao.mockResolvedValue([makeOrdem('op-1')]);
    listByOrdemProducaoIds.mockResolvedValue(
      new Map([['op-1', [makeLote('l1', 3), makeLote('l2', 2)]]]),
    );

    const result = await painelFornoService.getPainelForDate('2026-06-17');

    expect(result.date).toBe('2026-06-17');
    expect(result.ordens).toHaveLength(1);
    expect(result.ordens[0]).toMatchObject({
      ordemProducaoId: 'op-1',
      produto: 'HB Brioche 65g',
      tipoEstoque: 'Valepan',
      assadeiraNome: 'Lata 40',
      aProduzir: 10,
      produzido: 5,
      unidade: 'lt',
      lotes: [
        { loteId: 'l1', assadeiras: 3 },
        { loteId: 'l2', assadeiras: 2 },
      ],
    });
  });
});

describe('PainelFornoService.getCargaCompleta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    ]);
    assadeirasIn.mockResolvedValue({
      data: [{ id: 'ass-1', nome: 'Lata 40' }],
      error: null,
    });
    findUltimaDataComPedidos.mockResolvedValue('2026-06-17');
    findDataAnteriorComPedidos.mockResolvedValue('2026-06-16');
  });

  it('retorna ordens e snapshots de comparação', async () => {
    const ordem = makeOrdem('op-1');
    listByDatasProducao.mockResolvedValue(
      new Map([
        ['2026-06-17', [ordem]],
        ['2026-06-10', [ordem]],
        ['2026-06-16', [ordem]],
      ]),
    );
    listByOrdemProducaoIds.mockResolvedValue(
      new Map([['op-1', [makeLote('l1', 3)]]]),
    );

    const result = await painelFornoService.getCargaCompleta('2026-06-17');

    expect(result.comparacaoSemana.date).toBe('2026-06-10');
    expect(result.comparacaoAnterior.date).toBe('2026-06-16');
    expect(result.ordens).toHaveLength(1);
  });
});
