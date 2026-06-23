import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DEFAULT_ORDEM_ETAPA_STATUS } from '@/domain/producao-etapa/ordem-etapa-status-defaults';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

const mockUpdateEtapaFinalizacao = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: {
    updateEtapaFinalizacao: (...args: unknown[]) => mockUpdateEtapaFinalizacao(...args),
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

describe('EtapaFinalizacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEtapaFinalizacao.mockResolvedValue(makeOrdem());
  });

  it('assertEtapaNaoFinalizada lança quando etapa já finalizada', async () => {
    const { etapaFinalizacaoService } = await import('./etapa-finalizacao-service');
    const ordem = makeOrdem({ fermentacaoFinalizada: true });

    expect(() =>
      etapaFinalizacaoService.assertEtapaNaoFinalizada(ordem, 'fermentacao'),
    ).toThrow(/fermentação já finalizada/i);
  });

  it('mantém etapa aberta quando continuaProduzindo é true', async () => {
    const { etapaFinalizacaoService } = await import('./etapa-finalizacao-service');

    await etapaFinalizacaoService.aplicarAposSalvarLote({
      ordemId: 'ordem-1',
      etapa: 'forno',
      continuaProduzindo: true,
      totalProduzidoEtapa: 12,
    });

    expect(mockUpdateEtapaFinalizacao).toHaveBeenCalledWith('ordem-1', 'forno', {
      finalizada: false,
      metaConfirmada: null,
    });
  });

  it('finaliza etapa com meta confirmada quando continuaProduzindo é false', async () => {
    const { etapaFinalizacaoService } = await import('./etapa-finalizacao-service');

    await etapaFinalizacaoService.aplicarAposSalvarLote({
      ordemId: 'ordem-1',
      etapa: 'embalagem',
      continuaProduzindo: false,
      totalProduzidoEtapa: 53,
    });

    expect(mockUpdateEtapaFinalizacao).toHaveBeenCalledWith('ordem-1', 'embalagem', {
      finalizada: true,
      metaConfirmada: 53,
    });
  });

  it('rejeita finalização com total produzido zero', async () => {
    const { etapaFinalizacaoService } = await import('./etapa-finalizacao-service');

    await expect(
      etapaFinalizacaoService.aplicarAposSalvarLote({
        ordemId: 'ordem-1',
        etapa: 'fermentacao',
        continuaProduzindo: false,
        totalProduzidoEtapa: 0,
      }),
    ).rejects.toThrow(/sem produção registrada/i);

    expect(mockUpdateEtapaFinalizacao).not.toHaveBeenCalled();
  });

  it('reabre etapa finalizada limpando meta confirmada', async () => {
    const { etapaFinalizacaoService } = await import('./etapa-finalizacao-service');

    await etapaFinalizacaoService.reabrirEtapa('ordem-1', 'embalagem');

    expect(mockUpdateEtapaFinalizacao).toHaveBeenCalledWith('ordem-1', 'embalagem', {
      finalizada: false,
      metaConfirmada: null,
    });
  });
});
