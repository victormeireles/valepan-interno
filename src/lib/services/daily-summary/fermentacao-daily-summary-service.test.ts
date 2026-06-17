import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { fermentacaoDailySummaryService } from '@/lib/services/daily-summary/fermentacao-daily-summary-service';
import { painelFermentacaoService } from '@/lib/services/painel-fermentacao-service';

vi.mock('@/lib/services/painel-fermentacao-service', () => ({
  painelFermentacaoService: {
    getPainelForDate: vi.fn(),
  },
}));

const mockedGetPainel = vi.mocked(painelFermentacaoService.getPainelForDate);

function makeOrdem(
  overrides: Partial<PainelOrdemEtapa> & Pick<PainelOrdemEtapa, 'produto'>,
): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'op-1',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-06-17',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 10, unidades: 0 },
    produzidoBreakdown: { assadeiras: 0, unidades: 0 },
    unidade: 'lt',
    aProduzir: 10,
    produzido: 0,
    lotes: [],
    ...overrides,
  };
}

describe('FermentacaoDailySummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega ordens não produzidas na seção notProduced', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-17',
      ordens: [
        makeOrdem({ produto: 'Brioche 65g', aProduzir: 10, produzido: 0 }),
        makeOrdem({
          ordemProducaoId: 'op-2',
          produto: 'Hot Dog',
          aProduzir: 5,
          produzido: 0,
          pedido: { assadeiras: 5, unidades: 0 },
        }),
      ],
    });

    const result = await fermentacaoDailySummaryService.build('2026-06-17');

    expect(result.totals.notProduced.itemCount).toBe(2);
    expect(result.totals.notProduced.meta.lt).toBe(15);
    expect(result.totals.complete.itemCount).toBe(0);
  });

  it('classifica ordem completa e ordem parcial', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-17',
      ordens: [
        makeOrdem({
          produto: 'Completo',
          aProduzir: 10,
          produzido: 10,
          produzidoBreakdown: { assadeiras: 10, unidades: 0 },
        }),
        makeOrdem({
          ordemProducaoId: 'op-2',
          produto: 'Parcial',
          aProduzir: 10,
          produzido: 4,
          produzidoBreakdown: { assadeiras: 4, unidades: 0 },
        }),
      ],
    });

    const result = await fermentacaoDailySummaryService.build('2026-06-17');

    expect(result.totals.complete.itemCount).toBe(1);
    expect(result.totals.complete.produced.lt).toBe(10);
    expect(result.totals.partial.itemCount).toBe(1);
    expect(result.totals.partial.produced.lt).toBe(4);
    expect(result.totals.partial.meta!.lt).toBe(10);
  });

  it('usa unidade un quando modo é unidades', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-17',
      ordens: [
        makeOrdem({
          produto: 'HB Unidades',
          modoQuantidade: 'unidades',
          unidade: 'un',
          aProduzir: 240,
          produzido: 0,
          pedido: { assadeiras: 0, unidades: 240 },
        }),
      ],
    });

    const result = await fermentacaoDailySummaryService.build('2026-06-17');

    expect(result.totals.notProduced.meta.un).toBe(240);
    expect(result.totals.notProduced.meta.lt).toBeUndefined();
  });
});
