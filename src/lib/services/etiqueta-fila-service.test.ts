import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';

vi.mock('@/data/embalagem/EmbalagemLoteRepository', () => ({
  embalagemLoteRepository: {},
}));

vi.mock('@/data/embalagem/PedidoEmbalagemRepository', () => ({
  pedidoEmbalagemRepository: {},
}));

vi.mock('@/data/etiquetas/EtiquetasGeradasRepository', () => ({
  etiquetasGeradasRepository: {},
}));

vi.mock('@/lib/services/tipos-estoque-service', () => ({
  tiposEstoqueService: {},
}));

vi.mock('@/lib/services/products/supabase-product-service', () => ({
  SupabaseProductService: vi.fn(),
}));

const { EtiquetaFilaService } = await import('./etiqueta-fila-service');

const listOrdemProducaoIdsByProduzidoDate = vi.fn();
const listByPedidoEmbalagemIds = vi.fn();
const findByIdsPedido = vi.fn();
const findByOrdemProducaoIds = vi.fn();
const findByIdsTipos = vi.fn();
const findByIdsProdutos = vi.fn();

const basePedido = (
  id: string,
  overrides: Partial<PedidoEmbalagemRecord> = {},
): PedidoEmbalagemRecord => ({
  id,
  createdAt: '2026-06-11T08:00:00Z',
  updatedAt: '2026-06-11T08:00:00Z',
  dataProducao: '2026-06-11',
  dataFabricacaoEtiqueta: '2026-06-11',
  tipoEstoqueId: 'tipo-etiqueta',
  produtoId: 'prod-1',
  observacao: '',
  assadeiraId: 'ass-1',
  assadeiras: 10,
  ordemPlanejamento: 1,
  quantidade: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
  ...overrides,
});

function makeLote(
  pedidoId: string,
  produzidoEm: string,
  caixas: number,
): EmbalagemLoteRecord {
  return {
    id: `lote-${produzidoEm}`,
    createdAt: produzidoEm,
    modo: 'parcial',
    pedidoEmbalagemId: pedidoId,
    dataPedido: '2026-06-11',
    dataFabricacao: '2026-06-11',
    tipoEstoqueId: 'tipo-etiqueta',
    produtoId: 'prod-1',
    congelado: 'Não',
    quantidade: { caixas, pacotes: 0, unidades: 0, kg: 0 },
    produzidoEm,
  };
}

describe('EtiquetaFilaService.getFilaForDate', () => {
  const service = new EtiquetaFilaService({
    embalagemLoteRepository: {
      listOrdemProducaoIdsByProduzidoDate,
      listByPedidoEmbalagemIds,
    },
    pedidoEmbalagemRepository: {
      findByIds: findByIdsPedido,
    },
    etiquetasGeradasRepository: {
      findByOrdemProducaoIds,
    },
    tiposEstoqueService: {
      findByIds: findByIdsTipos,
    },
    productService: {
      findByIds: findByIdsProdutos,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    findByIdsTipos.mockResolvedValue([
      {
        id: 'tipo-etiqueta',
        nome: 'Cliente A',
        ativo: true,
        possuiEtiqueta: true,
        congelado: false,
      },
      {
        id: 'tipo-sem-etiqueta',
        nome: 'Cliente B',
        ativo: true,
        possuiEtiqueta: false,
        congelado: false,
      },
    ]);
    findByIdsProdutos.mockResolvedValue([
      { id: 'prod-1', nome: 'HB Brioche 65g' },
      { id: 'prod-2', nome: 'Baguete' },
    ]);
    findByOrdemProducaoIds.mockResolvedValue(new Map());
  });

  it('retorna fila vazia quando não há produção na data', async () => {
    listOrdemProducaoIdsByProduzidoDate.mockResolvedValue([]);

    const result = await service.getFilaForDate('2026-06-11');

    expect(result).toEqual({ date: '2026-06-11', pendentes: [], gerados: [] });
    expect(findByIdsPedido).not.toHaveBeenCalled();
  });

  it('filtra pedidos sem possui_etiqueta e separa pendentes/gerados', async () => {
    listOrdemProducaoIdsByProduzidoDate.mockResolvedValue(['ped-1', 'ped-2', 'ped-3']);
    findByIdsPedido.mockResolvedValue([
      basePedido('ped-1', { createdAt: '2026-06-11T10:00:00Z' }),
      basePedido('ped-2', {
        createdAt: '2026-06-11T09:00:00Z',
        tipoEstoqueId: 'tipo-sem-etiqueta',
        produtoId: 'prod-2',
      }),
      basePedido('ped-3', { createdAt: '2026-06-11T11:00:00Z' }),
    ]);

    const lotesMap = new Map<string, EmbalagemLoteRecord[]>([
      ['ped-1', [makeLote('ped-1', '2026-06-11T12:30:00Z', 20)]],
      ['ped-2', [makeLote('ped-2', '2026-06-11T13:00:00Z', 10)]],
      ['ped-3', [makeLote('ped-3', '2026-06-11T08:15:00Z', 5)]],
    ]);
    listByPedidoEmbalagemIds.mockResolvedValue(lotesMap);

    findByOrdemProducaoIds.mockResolvedValue(
      new Map([
        [
          'ped-3',
          {
            id: 'eg-1',
            ordemProducaoId: 'ped-3',
            produtoId: 'prod-1',
            tipoEstoqueId: 'tipo-etiqueta',
            dataFabricacao: '2026-06-11',
            modo: 'pedido' as const,
            geradoEm: '2026-06-11T14:00:00Z',
          },
        ],
      ]),
    );

    const result = await service.getFilaForDate('2026-06-11');

    expect(result.pendentes).toHaveLength(1);
    expect(result.pendentes[0].pedidoEmbalagemId).toBe('ped-1');
    expect(result.pendentes[0].produto).toBe('HB Brioche 65g');
    expect(result.pendentes[0].produzido.caixas).toBe(20);
    expect(result.pendentes[0].primeiroLoteHorario).toBeTruthy();

    expect(result.gerados).toHaveLength(1);
    expect(result.gerados[0].pedidoEmbalagemId).toBe('ped-3');
    expect(result.gerados[0].geradoEm).toBe('2026-06-11T14:00:00Z');
  });

  it('ordena pendentes com lote antes de sem lote e por created_at', async () => {
    listOrdemProducaoIdsByProduzidoDate.mockResolvedValue(['ped-sem', 'ped-com']);
    findByIdsPedido.mockResolvedValue([
      basePedido('ped-sem', {
        createdAt: '2026-06-11T08:00:00Z',
        dataFabricacaoEtiqueta: '',
      }),
      basePedido('ped-com', { createdAt: '2026-06-11T09:00:00Z' }),
    ]);

    listByPedidoEmbalagemIds.mockResolvedValue(
      new Map([
        ['ped-sem', [makeLote('ped-sem', '2026-06-11T10:00:00Z', 1)]],
        ['ped-com', [makeLote('ped-com', '2026-06-11T11:00:00Z', 2)]],
      ]),
    );

    const result = await service.getFilaForDate('2026-06-11');

    expect(result.pendentes.map((item) => item.pedidoEmbalagemId)).toEqual([
      'ped-com',
      'ped-sem',
    ]);
    expect(result.pendentes[0].lote).not.toBeNull();
    expect(result.pendentes[1].lote).toBeNull();
  });
});
