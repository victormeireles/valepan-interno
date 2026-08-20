import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  configOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from '@/domain/config-operacao/config-operacao-mapper';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { EstimativaProducaoService } from './estimativa-producao-service';

const op = (id: string, planejamento: number): OrdemProducaoRecord => ({
  id,
  createdAt: '',
  updatedAt: '',
  dataProducao: '2026-08-17',
  dataFabricacaoEtiqueta: '2026-08-17',
  tipoEstoqueId: 'tipo',
  produtoId: 'prod',
  observacao: '',
  assadeiraId: 'ass',
  assadeiras: 8,
  ordemPlanejamento: planejamento,
  quantidade: { caixas: 4, pacotes: 0, unidades: 100, kg: 0 },
  fermentacaoFinalizada: false,
  fermentacaoMetaConfirmada: null,
  fermentacaoFinalizadaEm: null,
  fornoFinalizada: false,
  fornoMetaConfirmada: null,
  fornoFinalizadaEm: null,
  embalagemFinalizada: false,
  embalagemMetaConfirmada: null,
  embalagemFinalizadaEm: null,
});

const rates = {
  anoMes: '2026-08',
  taxaAssadeirasHoraProducao: 200,
  taxaAssadeirasHoraForno: 200,
  taxaCaixasHoraEmbalagem: 80,
};

describe('EstimativaProducaoService.recalcForDate', () => {
  const listByDataProducao = vi.fn();
  const listDataProducaoFrom = vi.fn();
  const getConfig = vi.fn();
  const listProdutividade = vi.fn();
  const replaceForOrdens = vi.fn();
  const deleteForOrdemIds = vi.fn();
  const listByOrdemIds = vi.fn();

  const service = new EstimativaProducaoService({
    listByDataProducao,
    listDataProducaoFrom,
    getConfig,
    listProdutividade,
    replaceForOrdens,
    deleteForOrdemIds,
    listByOrdemIds,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue(
      configOperacaoMapper.mergeSnapshot(DEFAULT_CONFIG_OPERACAO, {
        turnos: [
          { etapa: 'fermentacao', numero: 1, inicio: '00:00', fim: '18:00' },
          { etapa: 'forno', numero: 1, inicio: '04:00', fim: '18:00' },
          { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
        ],
      }),
    );
    listProdutividade.mockResolvedValue([rates]);
    replaceForOrdens.mockResolvedValue(undefined);
    deleteForOrdemIds.mockResolvedValue(undefined);
  });

  it('grava o cronograma previsto das OPs do dia', async () => {
    listByDataProducao.mockResolvedValue([op('op-1', 1), op('op-2', 2)]);

    const result = await service.recalcForDate('2026-08-17');

    expect(result.status).toBe('ok');
    expect(replaceForOrdens).toHaveBeenCalledTimes(1);
    const [ids, rows] = replaceForOrdens.mock.calls[0] as [string[], Array<{ ordemProducaoId: string }>];
    expect(ids).toEqual(['op-1', 'op-2']);
    expect(rows).toHaveLength(2);
    expect(rows[0].ordemProducaoId).toBe('op-1');
    expect(rows[1].ordemProducaoId).toBe('op-2');
  });

  it('não grava e limpa previstos quando não há produtividade', async () => {
    listByDataProducao.mockResolvedValue([op('op-1', 1)]);
    listProdutividade.mockResolvedValue([]);

    const result = await service.recalcForDate('2026-08-17');

    expect(result.status).toBe('sem_produtividade');
    expect(replaceForOrdens).not.toHaveBeenCalled();
    expect(deleteForOrdemIds).toHaveBeenCalledWith(['op-1']);
  });

  it('não grava nada quando o dia não tem OPs', async () => {
    listByDataProducao.mockResolvedValue([]);

    const result = await service.recalcForDate('2026-08-17');

    expect(result.status).toBe('vazio');
    expect(replaceForOrdens).not.toHaveBeenCalled();
    expect(deleteForOrdemIds).not.toHaveBeenCalled();
  });

  it('não ocupa a fila com OPs fora das categorias visíveis da embalagem', async () => {
    const visivel = { ...op('op-1', 1), produtoId: 'prod-hamb', assadeiras: 8 };
    const oculto = { ...op('op-2', 2), produtoId: 'prod-forma', assadeiras: 800 };
    const visivelDepois = { ...op('op-3', 3), produtoId: 'prod-hamb', assadeiras: 8 };
    listByDataProducao.mockResolvedValue([visivel, oculto, visivelDepois]);

    const filteredService = new EstimativaProducaoService({
      listByDataProducao,
      listDataProducaoFrom,
      getConfig,
      listProdutividade,
      replaceForOrdens,
      deleteForOrdemIds,
      listByOrdemIds,
      filterOrdens: async (ordens) =>
        ordens.filter((ordem) => ordem.produtoId === 'prod-hamb'),
    });

    const result = await filteredService.recalcForDate('2026-08-17');

    expect(result.status).toBe('ok');
    const [ids, rows] = replaceForOrdens.mock.calls[0] as [
      string[],
      Array<{ ordemProducaoId: string; fermentacaoInicioPrevisto: string; fermentacaoFimPrevisto: string }>,
    ];
    expect(ids).toEqual(['op-1', 'op-2', 'op-3']);
    expect(rows.map((row) => row.ordemProducaoId)).toEqual(['op-1', 'op-3']);
    expect(rows[1].fermentacaoInicioPrevisto).toBe(rows[0].fermentacaoFimPrevisto);
  });

  it('limpa previstos quando nenhuma OP do dia é visível na embalagem', async () => {
    listByDataProducao.mockResolvedValue([op('op-1', 1)]);
    const filteredService = new EstimativaProducaoService({
      listByDataProducao,
      listDataProducaoFrom,
      getConfig,
      listProdutividade,
      replaceForOrdens,
      deleteForOrdemIds,
      listByOrdemIds,
      filterOrdens: async () => [],
    });

    const result = await filteredService.recalcForDate('2026-08-17');

    expect(result.status).toBe('vazio');
    expect(replaceForOrdens).not.toHaveBeenCalled();
    expect(deleteForOrdemIds).toHaveBeenCalledWith(['op-1']);
  });
});

describe('EstimativaProducaoService.recalcOpenDates', () => {
  it('recalcula cada data com OP a partir de ontem', async () => {
    const listByDataProducao = vi.fn(async (date: string) =>
      date === '2026-08-17' ? [op('op-1', 1)] : [],
    );
    const replaceForOrdens = vi.fn();
    const service = new EstimativaProducaoService({
      listByDataProducao,
      listDataProducaoFrom: vi.fn().mockResolvedValue(['2026-08-17', '2026-08-18']),
      getConfig: vi.fn().mockResolvedValue(DEFAULT_CONFIG_OPERACAO),
      listProdutividade: vi.fn().mockResolvedValue([rates]),
      replaceForOrdens,
      deleteForOrdemIds: vi.fn(),
      listByOrdemIds: vi.fn(),
    });

    await service.recalcOpenDates('2026-08-16');

    expect(listByDataProducao).toHaveBeenCalledWith('2026-08-17');
    expect(listByDataProducao).toHaveBeenCalledWith('2026-08-18');
    expect(replaceForOrdens).toHaveBeenCalledTimes(1);
  });
});
