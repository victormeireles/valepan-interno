import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';

const mockReceitaRepo = { loadContextoProducaoPorProduto: vi.fn() };
const mockAplicador = { reconciliar: vi.fn(), estornar: vi.fn() };
const mockExcecaoRepo = { loadIngredientes: vi.fn() };

const lote: EmbalagemLoteRecord = {
  id: 'lote-1',
  createdAt: '2026-08-24T10:00:00Z',
  modo: 'parcial',
  dataPedido: '2026-08-24',
  dataFabricacao: '2026-08-24',
  tipoEstoqueId: 'tipo-damiao',
  produtoId: 'prod-1',
  congelado: 'Não',
  quantidade: { caixas: 1, pacotes: 0, unidades: 0, kg: 0 },
  produzidoEm: '2026-08-24T10:00:00Z',
};

const contextoProduto = {
  produtoNome: 'HB 65g',
  unidadesPorAssadeira: null,
  receitas: [
    {
      tipo: 'embalagem' as const,
      quantidadePorProduto: 4,
      ingredientes: [{ insumoId: 'plastico', quantidadePadrao: 1 }],
    },
    {
      tipo: 'caixa' as const,
      quantidadePorProduto: 48,
      ingredientes: [{ insumoId: 'caixa-valepan', quantidadePadrao: 1 }],
    },
  ],
};

vi.mock('@/data/insumos/InsumoReceitaMassaRepository', () => ({
  insumoReceitaMassaRepository: mockReceitaRepo,
}));
vi.mock('@/lib/services/insumo-consumo-aplicador', () => ({
  insumoConsumoAplicador: mockAplicador,
}));
vi.mock('@/data/insumos/TipoEstoqueReceitaCaixaRepository', () => ({
  tipoEstoqueReceitaCaixaRepository: mockExcecaoRepo,
}));

describe('InsumoConsumoEmbalagemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAplicador.reconciliar.mockResolvedValue(undefined);
    mockReceitaRepo.loadContextoProducaoPorProduto.mockResolvedValue(contextoProduto);
  });

  it('lote Damião com exceção debita caixa Damião e mantém plástico', async () => {
    mockExcecaoRepo.loadIngredientes.mockResolvedValue([
      { insumoId: 'caixa-damiao', quantidadePadrao: 1 },
    ]);
    const { InsumoConsumoEmbalagemService } = await import(
      './insumo-consumo-embalagem-service'
    );
    const service = new InsumoConsumoEmbalagemService(
      mockReceitaRepo as never,
      mockAplicador as never,
      mockExcecaoRepo as never,
    );
    const result = await service.sincronizar(lote);
    expect(result.aplicado).toBe(true);
    expect(mockAplicador.reconciliar).toHaveBeenCalledWith(
      expect.objectContaining({
        consumosAlvo: expect.arrayContaining([
          { insumoId: 'plastico', quantidade: 12 },
          { insumoId: 'caixa-damiao', quantidade: 1 },
        ]),
      }),
    );
    const alvo = mockAplicador.reconciliar.mock.calls[0][0].consumosAlvo;
    expect(alvo.find((c: { insumoId: string }) => c.insumoId === 'caixa-valepan')).toBeUndefined();
  });

  it('lote sem exceção debita caixa do produto', async () => {
    mockExcecaoRepo.loadIngredientes.mockResolvedValue(null);
    const { InsumoConsumoEmbalagemService } = await import(
      './insumo-consumo-embalagem-service'
    );
    const service = new InsumoConsumoEmbalagemService(
      mockReceitaRepo as never,
      mockAplicador as never,
      mockExcecaoRepo as never,
    );
    await service.sincronizar({ ...lote, tipoEstoqueId: 'tipo-valepan' });
    const alvo = mockAplicador.reconciliar.mock.calls[0][0].consumosAlvo;
    expect(alvo).toEqual(
      expect.arrayContaining([
        { insumoId: 'plastico', quantidade: 12 },
        { insumoId: 'caixa-valepan', quantidade: 1 },
      ]),
    );
  });
});
