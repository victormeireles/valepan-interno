import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import { embalagemDailySummaryService } from '@/lib/services/daily-summary/embalagem-daily-summary-service';
import { painelEmbalagemService } from '@/lib/services/painel-embalagem-service';

vi.mock('@/lib/services/painel-embalagem-service', () => ({
  painelEmbalagemService: {
    getPainelForDate: vi.fn(),
  },
}));

const mockedGetPainel = vi.mocked(painelEmbalagemService.getPainelForDate);

function makePedido(
  overrides: Partial<PainelPedidoEmbalagem> & Pick<PainelPedidoEmbalagem, 'produto' | 'cliente'>,
): PainelPedidoEmbalagem {
  return {
    pedidoEmbalagemId: 'ped-1',
    observacao: '',
    dataPedido: '2026-06-09',
    dataFabricacao: '2026-06-10',
    pedido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
    produzido: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
    unidade: 'cx',
    aProduzir: 100,
    produzidoScalar: 0,
    possuiEtiqueta: true,
    lotes: [],
    ...overrides,
  };
}

describe('EmbalagemDailySummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega pedidos não produzidos na seção notProduced', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-09',
      pedidos: [
        makePedido({ produto: 'Brioche 65g', cliente: 'HB', aProduzir: 50 }),
        makePedido({
          pedidoEmbalagemId: 'ped-2',
          produto: 'Hot Dog',
          cliente: 'HB',
          aProduzir: 30,
          pedido: { caixas: 30, pacotes: 0, unidades: 0, kg: 0 },
        }),
      ],
    });

    const result = await embalagemDailySummaryService.build('2026-06-09');

    expect(result.totals.notProduced.itemCount).toBe(2);
    expect(result.totals.notProduced.meta.cx).toBe(80);
    expect(result.totals.complete.itemCount).toBe(0);
    expect(result.photos.missingRequiredCount).toBe(0);
  });

  it('classifica pedido completo e pedido parcial', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-09',
      pedidos: [
        makePedido({
          produto: 'Completo',
          cliente: 'HB',
          aProduzir: 100,
          produzidoScalar: 100,
          produzido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
          lotes: [
            {
              loteId: 'l1',
              modo: 'parcial',
              quantidade: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
              produzidoEm: '2026-06-09T12:00:00Z',
              congelado: 'Não',
              pacoteFotoUrl: 'https://x/p.jpg',
              etiquetaFotoUrl: 'https://x/e.jpg',
              palletFotoUrl: 'https://x/t.jpg',
            },
          ],
        }),
        makePedido({
          pedidoEmbalagemId: 'ped-2',
          produto: 'Parcial',
          cliente: 'HB',
          aProduzir: 100,
          produzidoScalar: 40,
          produzido: { caixas: 40, pacotes: 0, unidades: 0, kg: 0 },
          lotes: [
            {
              loteId: 'l2',
              modo: 'parcial',
              quantidade: { caixas: 40, pacotes: 0, unidades: 0, kg: 0 },
              produzidoEm: '2026-06-09T13:00:00Z',
              congelado: 'Não',
              pacoteFotoUrl: 'https://x/p.jpg',
              etiquetaFotoUrl: 'https://x/e.jpg',
              palletFotoUrl: 'https://x/t.jpg',
            },
          ],
        }),
      ],
    });

    const result = await embalagemDailySummaryService.build('2026-06-09');

    expect(result.totals.complete.itemCount).toBe(1);
    expect(result.totals.complete.produced.cx).toBe(100);
    expect(result.totals.partial.itemCount).toBe(1);
    expect(result.totals.partial.produced.cx).toBe(40);
    expect(result.totals.partial.meta!.cx).toBe(100);
  });

  it('conta pedidos finalizados sem fotos obrigatórias', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-09',
      pedidos: [
        makePedido({
          produto: 'Sem fotos',
          cliente: 'HB',
          aProduzir: 50,
          produzidoScalar: 50,
          produzido: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
          lotes: [
            {
              loteId: 'l1',
              modo: 'parcial',
              quantidade: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
              produzidoEm: '2026-06-09T12:00:00Z',
              congelado: 'Não',
            },
          ],
        }),
      ],
    });

    const result = await embalagemDailySummaryService.build('2026-06-09');

    expect(result.photos.missingRequiredCount).toBe(1);
    expect(result.photos.critical).toHaveLength(1);
    expect(result.photos.critical[0].produto).toBe('Sem fotos');
  });
});
