import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';

const listByDataProducao = vi.fn();
const listByPedidoEmbalagemIds = vi.fn();
const listFermentacaoByOrdem = vi.fn();
const listFornoByOrdem = vi.fn();
const findByIdsTipos = vi.fn();
const findByIdsProdutos = vi.fn();
const getIdsVisiveisEmbalagem = vi.fn();
const loadAssadeiraCtx = vi.fn();

vi.mock('@/data/embalagem/PedidoEmbalagemRepository', () => ({
  pedidoEmbalagemRepository: {
    listByDataProducao: (...args: unknown[]) => listByDataProducao(...args),
  },
}));

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {
    listByPedidoEmbalagemIds: (...args: unknown[]) => listByPedidoEmbalagemIds(...args),
  },
}));

vi.mock('@/data/producao-etapa/FermentacaoLoteRepository', () => ({
  fermentacaoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => listFermentacaoByOrdem(...args),
  },
}));

vi.mock('@/data/producao-etapa/FornoLoteRepository', () => ({
  fornoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => listFornoByOrdem(...args),
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

vi.mock('@/domain/categorias/categoria-visibilidade-manager', () => ({
  categoriaVisibilidadeManager: {
    getIdsVisiveisEmbalagem: (...args: unknown[]) => getIdsVisiveisEmbalagem(...args),
  },
}));

vi.mock('@/domain/embalagem/painel-embalagem-enrichment', () => ({
  loadAssadeiraCtxByProdutoId: (...args: unknown[]) => loadAssadeiraCtx(...args),
  mapEtapasProduzidoPorOrdem: () => new Map(),
  resolveEtapasLtForPedido: () => ({ fermentacao: 0, forno: 0 }),
}));

const { painelEmbalagemService } = await import('./painel-embalagem-service');

function makePedido(id: string, produtoId: string): PedidoEmbalagemRecord {
  return {
    id,
    createdAt: '2026-06-23T08:00:00Z',
    updatedAt: '2026-06-23T08:00:00Z',
    dataProducao: '2026-06-23',
    dataFabricacaoEtiqueta: '2026-06-24',
    tipoEstoqueId: 'tipo-1',
    produtoId,
    observacao: '',
    assadeiraId: 'ass-1',
    assadeiras: 10,
    ordemPlanejamento: 1,
    quantidade: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
    embalagemFinalizada: false,
  };
}

describe('PainelEmbalagemService filtro por categoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdsTipos.mockResolvedValue([
      {
        id: 'tipo-1',
        nome: 'HB',
        ativo: true,
        possuiEtiqueta: true,
        congelado: false,
        mostrarTextoCongelado: false,
      },
    ]);
    findByIdsProdutos.mockResolvedValue([
      {
        id: 'prod-hamb',
        nome: 'Brioche',
        categoriaId: 'cat-hamb',
        unidadeNomeResumido: 'CX',
        codigo: 'BR',
        unitBarcode: null,
        boxUnits: 24,
        packageUnits: null,
        unitWeight: 65,
        unidadesAssadeira: 40,
      },
      {
        id: 'prod-forma',
        nome: 'Forma',
        categoriaId: 'cat-forma',
        unidadeNomeResumido: 'CX',
        codigo: 'FM',
        unitBarcode: null,
        boxUnits: 12,
        packageUnits: null,
        unitWeight: 500,
        unidadesAssadeira: null,
      },
    ]);
    getIdsVisiveisEmbalagem.mockResolvedValue(new Set(['cat-hamb']));
    listByPedidoEmbalagemIds.mockResolvedValue(new Map());
    listFermentacaoByOrdem.mockResolvedValue(new Map());
    listFornoByOrdem.mockResolvedValue(new Map());
    loadAssadeiraCtx.mockResolvedValue(new Map());
  });

  it('exclui pedidos de categoria não visível', async () => {
    listByDataProducao.mockResolvedValue([
      makePedido('ped-1', 'prod-hamb'),
      makePedido('ped-2', 'prod-forma'),
    ]);

    const result = await painelEmbalagemService.getPainelForDate('2026-06-23');

    expect(result.pedidos).toHaveLength(1);
    expect(result.pedidos[0].produto).toBe('Brioche');
  });
});
