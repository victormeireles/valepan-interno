import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DEFAULT_ORDEM_ETAPA_STATUS } from '@/domain/producao-etapa/ordem-etapa-status-defaults';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const mockFindById = vi.fn();
const mockReabrirEtapa = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

vi.mock('@/lib/services/etapa-finalizacao-service', () => ({
  etapaFinalizacaoService: {
    reabrirEtapa: (...args: unknown[]) => mockReabrirEtapa(...args),
  },
}));

function makeOrdem(overrides: Partial<OrdemProducaoRecord> = {}): OrdemProducaoRecord {
  return {
    id: 'ordem-1',
    dataProducao: '2026-06-23',
    dataFabricacaoEtiqueta: '2026-06-23',
    tipoEstoqueId: 'tipo-1',
    produtoId: 'prod-1',
    observacao: '',
    assadeiraId: 'ass-1',
    assadeiras: 10,
    ordemPlanejamento: 1,
    quantidade: { unidades: 240, caixas: 0, pacotes: 0, kg: 0 },
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
    ...DEFAULT_ORDEM_ETAPA_STATUS,
    ...overrides,
  };
}

describe('EtapaReabrirService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReabrirEtapa.mockResolvedValue(makeOrdem());
  });

  it('reabre etapa finalizada', async () => {
    mockFindById.mockResolvedValue(makeOrdem({ fornoFinalizada: true }));
    const { etapaReabrirService } = await import('./etapa-reabrir-service');

    await etapaReabrirService.reabrir('ordem-1', 'forno');

    expect(mockReabrirEtapa).toHaveBeenCalledWith('ordem-1', 'forno');
  });

  it('rejeita quando ordem não existe', async () => {
    mockFindById.mockResolvedValue(null);
    const { etapaReabrirService } = await import('./etapa-reabrir-service');

    await expect(etapaReabrirService.reabrir('ordem-1', 'fermentacao')).rejects.toThrow(
      /não encontrada/i,
    );
  });

  it('rejeita quando etapa já está aberta', async () => {
    mockFindById.mockResolvedValue(makeOrdem({ fermentacaoFinalizada: false }));
    const { etapaReabrirService } = await import('./etapa-reabrir-service');

    await expect(etapaReabrirService.reabrir('ordem-1', 'fermentacao')).rejects.toThrow(
      /já está aberta/i,
    );
  });
});
