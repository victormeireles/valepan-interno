import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/insumos/InsumoDistribuidorRepository', () => ({
  insumoDistribuidorRepository: {},
  InsumoDistribuidorRepository: class {},
}));
vi.mock('@/data/insumos/InsumoRegraCompraRepository', () => ({
  insumoRegraCompraRepository: {},
  InsumoRegraCompraRepository: class {},
}));
vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {},
}));

import { InsumoCompraRegraManager } from './insumo-compra-regra-manager';

describe('InsumoCompraRegraManager', () => {
  const listAllWithInsumo = vi.fn();
  const listByInsumoIds = vi.fn();
  const upsert = vi.fn();
  const replaceForInsumo = vi.fn();
  const listarInsumosAtivos = vi.fn();

  let manager: InsumoCompraRegraManager;

  beforeEach(() => {
    vi.clearAllMocks();
    listAllWithInsumo.mockResolvedValue([]);
    listByInsumoIds.mockResolvedValue([]);
    upsert.mockImplementation(async (row) => row);
    replaceForInsumo.mockResolvedValue(undefined);
    listarInsumosAtivos.mockResolvedValue([]);

    manager = new InsumoCompraRegraManager({
      regraRepository: { listAllWithInsumo, upsert },
      distribuidorRepository: { listByInsumoIds, replaceForInsumo },
      listarInsumosAtivos,
    });
  });

  it('lista todos os insumos ativos com regra opcional e distribuidores', async () => {
    listarInsumosAtivos.mockResolvedValue([
      { id: 'insumo-1', nome: 'Farinha', unidade: 'kg' },
      { id: 'insumo-2', nome: 'Fermento', unidade: 'kg' },
    ]);
    listAllWithInsumo.mockResolvedValue([
      {
        insumo_id: 'insumo-1',
        lead_time_dias: 3,
        janela_tipo: 'qualquer',
        dias_semana: null,
        quantidade_minima: 10,
        quantidade_maxima: 50,
        ativo: true,
        created_at: '2026-08-12T12:00:00.000Z',
        updated_at: '2026-08-12T12:00:00.000Z',
        nome: 'Farinha',
        unidade: 'kg',
      },
    ]);
    listByInsumoIds.mockResolvedValue([
      {
        id: 'distribuidor-1',
        insumo_id: 'insumo-1',
        nome: 'Fornecedor A',
        preferencial: true,
        ordem: 0,
        created_at: '2026-08-12T12:00:00.000Z',
      },
    ]);

    await expect(manager.listarRegrasParaConfig()).resolves.toEqual([
      {
        insumoId: 'insumo-1',
        nome: 'Farinha',
        unidade: 'kg',
        regra: expect.objectContaining({
          insumo_id: 'insumo-1',
          lead_time_dias: 3,
        }),
        distribuidores: [expect.objectContaining({ nome: 'Fornecedor A' })],
      },
      {
        insumoId: 'insumo-2',
        nome: 'Fermento',
        unidade: 'kg',
        regra: null,
        distribuidores: [],
      },
    ]);
    expect(listByInsumoIds).toHaveBeenCalledWith(['insumo-1', 'insumo-2']);
  });

  it('salva regra validada e substitui distribuidores na ordem informada', async () => {
    await manager.salvarRegra({
      insumoId: 'insumo-1',
      leadTimeDias: 7,
      janelaTipo: 'qualquer',
      diasSemana: null,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      ativo: true,
      distribuidores: [
        { nome: ' DAXIA ', preferencial: true },
        { nome: 'PANTEC', preferencial: false },
      ],
    });

    expect(upsert).toHaveBeenCalledWith({
      insumo_id: 'insumo-1',
      lead_time_dias: 7,
      janela_tipo: 'qualquer',
      dias_semana: null,
      quantidade_minima: null,
      quantidade_maxima: null,
      ativo: true,
    });
    expect(replaceForInsumo).toHaveBeenCalledWith('insumo-1', [
      { nome: 'DAXIA', preferencial: true, ordem: 0 },
      { nome: 'PANTEC', preferencial: false, ordem: 1 },
    ]);
  });

  it('rejeita regra inválida antes de persistir', async () => {
    await expect(
      manager.salvarRegra({
        insumoId: 'insumo-1',
        leadTimeDias: 7,
        janelaTipo: 'dias_semana',
        diasSemana: [],
        quantidadeMinima: 20,
        quantidadeMaxima: 10,
        ativo: true,
        distribuidores: [],
      }),
    ).rejects.toThrow(/Quantidade mínima[\s\S]*Selecione ao menos um dia/);

    expect(upsert).not.toHaveBeenCalled();
    expect(replaceForInsumo).not.toHaveBeenCalled();
  });

  it('aplica seed somente em insumos ativos encontrados por nome normalizado', async () => {
    listarInsumosAtivos.mockResolvedValue([
      { id: 'insumo-1', nome: '  ÁLCOOL ' },
    ]);

    const result = await manager.aplicarSeedPlanilha([
      {
        nome: 'Álcool',
        nomeNormalizado: 'alcool',
        leadTimeDias: 1,
        janelaTipo: 'qualquer',
        diasSemana: null,
        quantidadeMinima: null,
        quantidadeMaxima: 300,
        distribuidores: [{ nome: 'ALZIRA', preferencial: true }],
      },
      {
        nome: 'Glúten',
        nomeNormalizado: 'gluten',
        leadTimeDias: 3,
        janelaTipo: 'qualquer',
        diasSemana: null,
        quantidadeMinima: null,
        quantidadeMaxima: null,
        distribuidores: [],
      },
    ]);

    expect(result).toEqual({ atualizados: 1, naoEncontrados: ['Glúten'] });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(replaceForInsumo).toHaveBeenCalledWith('insumo-1', [
      { nome: 'ALZIRA', preferencial: true, ordem: 0 },
    ]);
  });
});
