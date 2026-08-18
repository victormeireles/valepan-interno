import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DEFAULT_ORDEM_ETAPA_STATUS } from '@/domain/producao-etapa/ordem-etapa-status-defaults';
import { TurnoRequeridoError } from '@/domain/producao-turno/turno-requerido-error';

const mockFindById = vi.fn();
const mockListByOrdem = vi.fn();
const mockInsert = vi.fn();
const mockFindLoteById = vi.fn();
const mockUpdateById = vi.fn();
const mockAssertEtapaNaoFinalizada = vi.fn();
const mockAplicarAposSalvarLote = vi.fn();
const mockRequireNumero = vi.fn();

vi.mock('@/data/producao/OrdemProducaoRepository', () => ({
  ordemProducaoRepository: { findById: (...args: unknown[]) => mockFindById(...args) },
}));
vi.mock('@/data/producao-etapa/FornoLoteRepository', () => ({
  fornoLoteRepository: {
    listByOrdemProducaoIds: (...args: unknown[]) => mockListByOrdem(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    findById: (...args: unknown[]) => mockFindLoteById(...args),
    updateById: (...args: unknown[]) => mockUpdateById(...args),
    deleteById: vi.fn(),
  },
}));
vi.mock('@/lib/services/etapa-finalizacao-service', () => ({
  etapaFinalizacaoService: {
    assertEtapaNaoFinalizada: (...args: unknown[]) => mockAssertEtapaNaoFinalizada(...args),
    aplicarAposSalvarLote: (...args: unknown[]) => mockAplicarAposSalvarLote(...args),
  },
}));
vi.mock('@/lib/services/insumo-consumo-forno-service', () => ({
  insumoConsumoFornoService: {
    sincronizar: vi.fn().mockResolvedValue({ aplicado: true, avisos: [] }),
    estornar: vi.fn().mockResolvedValue({ aplicado: true, avisos: [] }),
  },
}));
vi.mock('@/lib/services/producao-turno-service', () => ({
  producaoTurnoService: {
    requireNumero: (...args: unknown[]) => mockRequireNumero(...args),
  },
}));

describe('FornoLoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({
      id: 'o1',
      assadeiraId: 'a1',
      assadeiras: 10,
      quantidade: { unidades: 240, caixas: 0, pacotes: 0, kg: 0 },
      ...DEFAULT_ORDEM_ETAPA_STATUS,
    });
    mockListByOrdem.mockResolvedValue(new Map([['o1', [{ id: 'l2', assadeiras: 8, unidades: 0 }]]]));
    mockInsert.mockResolvedValue({ id: 'l-new' });
    mockFindLoteById.mockResolvedValue({
      id: 'l1',
      ordemProducaoId: 'o1',
      assadeiras: 2,
      unidades: 0,
      fotos: {},
    });
    mockUpdateById.mockResolvedValue({ id: 'l1', assadeiras: 5, unidades: 0 });
    mockAplicarAposSalvarLote.mockResolvedValue({ id: 'o1' });
    mockRequireNumero.mockResolvedValue(1);
  });

  it('cria lote acima do saldo da ordem', async () => {
    const { fornoLoteService } = await import('./forno-lote-service');
    const result = await fornoLoteService.criarLotePorOrdem({
      ordemProducaoId: 'o1',
      quantidade: { assadeiras: 5, unidades: 0 },
    });

    expect(result.lote.id).toBe('l-new');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ turno: 1 }));
  });

  it('cria lote dentro do saldo', async () => {
    const { fornoLoteService } = await import('./forno-lote-service');
    const result = await fornoLoteService.criarLotePorOrdem({
      ordemProducaoId: 'o1',
      quantidade: { assadeiras: 2, unidades: 0 },
    });
    expect(result.lote.id).toBe('l-new');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ turno: 1 }));
  });

  it('não insere lote quando o turno do dia é inválido', async () => {
    mockRequireNumero.mockRejectedValue(new TurnoRequeridoError());
    const { fornoLoteService } = await import('./forno-lote-service');

    await expect(
      fornoLoteService.criarLotePorOrdem({
        ordemProducaoId: 'o1',
        quantidade: { assadeiras: 5, unidades: 0 },
      }),
    ).rejects.toBeInstanceOf(TurnoRequeridoError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejeita lote com quantidade zero', async () => {
    const { fornoLoteService } = await import('./forno-lote-service');

    await expect(
      fornoLoteService.criarLotePorOrdem({
        ordemProducaoId: 'o1',
        quantidade: { assadeiras: 0, unidades: 0 },
      }),
    ).rejects.toThrow(/maior que zero/i);
  });

  it('atualiza lote mesmo quando o total passa da ordem', async () => {
    const { fornoLoteService } = await import('./forno-lote-service');
    const result = await fornoLoteService.atualizarLote('l1', {
      quantidade: { assadeiras: 5, unidades: 0 },
    });

    expect(result.lote.id).toBe('l1');
    expect(mockUpdateById).toHaveBeenCalled();
    expect(mockUpdateById.mock.calls[0][1]).not.toHaveProperty('turno');
    expect(mockRequireNumero).not.toHaveBeenCalled();
  });
});
