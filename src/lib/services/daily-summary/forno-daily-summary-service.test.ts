import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { fornoDailySummaryService } from '@/lib/services/daily-summary/forno-daily-summary-service';
import { painelFornoService } from '@/lib/services/painel-forno-service';

vi.mock('@/lib/services/painel-forno-service', () => ({
  painelFornoService: {
    getPainelForDate: vi.fn(),
  },
}));

const mockedGetPainel = vi.mocked(painelFornoService.getPainelForDate);

function makeOrdem(
  overrides: Partial<PainelOrdemEtapa> & Pick<PainelOrdemEtapa, 'produto'>,
): PainelOrdemEtapa {
  return {
    ordemProducaoId: 'op-1',
    tipoEstoque: 'Valepan',
    observacao: '',
    dataProducao: '2026-06-17',
    modoQuantidade: 'assadeiras',
    pedido: { assadeiras: 8, unidades: 0 },
    produzidoBreakdown: { assadeiras: 0, unidades: 0 },
    unidade: 'lt',
    aProduzir: 8,
    produzido: 0,
    lotes: [],
    ...overrides,
  };
}

describe('FornoDailySummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrega ordens não produzidas na seção notProduced', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-17',
      ordens: [
        makeOrdem({ produto: 'Brioche 65g', aProduzir: 8, produzido: 0 }),
        makeOrdem({
          ordemProducaoId: 'op-2',
          produto: 'Hot Dog',
          aProduzir: 3,
          produzido: 0,
          pedido: { assadeiras: 3, unidades: 0 },
        }),
      ],
    });

    const result = await fornoDailySummaryService.build('2026-06-17');

    expect(result.totals.notProduced.itemCount).toBe(2);
    expect(result.totals.notProduced.meta.lt).toBe(11);
    expect(result.totals.complete.itemCount).toBe(0);
  });

  it('classifica ordem completa e ordem parcial', async () => {
    mockedGetPainel.mockResolvedValue({
      date: '2026-06-17',
      ordens: [
        makeOrdem({
          produto: 'Completo',
          aProduzir: 8,
          produzido: 8,
          produzidoBreakdown: { assadeiras: 8, unidades: 0 },
        }),
        makeOrdem({
          ordemProducaoId: 'op-2',
          produto: 'Parcial',
          aProduzir: 8,
          produzido: 2,
          produzidoBreakdown: { assadeiras: 2, unidades: 0 },
        }),
      ],
    });

    const result = await fornoDailySummaryService.build('2026-06-17');

    expect(result.totals.complete.itemCount).toBe(1);
    expect(result.totals.complete.produced.lt).toBe(8);
    expect(result.totals.partial.itemCount).toBe(1);
    expect(result.totals.partial.produced.lt).toBe(2);
    expect(result.totals.partial.meta!.lt).toBe(8);
  });
});
