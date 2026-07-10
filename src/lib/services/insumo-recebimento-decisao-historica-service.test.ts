import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/insumos/InsumoMapeamentoRepository', () => ({
  insumoMapeamentoRepository: {},
  InsumoMapeamentoRepository: class {},
}));
vi.mock('@/data/insumos/InsumoPendenciaRepository', () => ({
  insumoPendenciaRepository: {},
  InsumoPendenciaRepository: class {},
}));

import type { IntegracaoInsumoRow } from '@/domain/types/insumo-estoque-db';
import { InsumoRecebimentoDecisaoHistoricaService } from '@/lib/services/insumo-recebimento-decisao-historica-service';

const mapeamentoBase: IntegracaoInsumoRow = {
  id: 'map-1',
  empresa_id: 'emp-1',
  omie_id_produto: 500,
  omie_codigo_produto: 'FAR-001',
  insumo_id: 'insumo-1',
  fator_conversao: 25,
  descricao_omie: 'Farinha Especial',
  ativo: true,
  created_at: '2026-06-19T10:00:00Z',
  updated_at: '2026-06-19T10:00:00Z',
};

describe('InsumoRecebimentoDecisaoHistoricaService', () => {
  it('detecta produto ignorado pelo id Omie', async () => {
    const pendenciaRepository = {
      existsIgnoradoPorProdutoOmie: vi.fn().mockResolvedValue(true),
      existsIgnoradoPorDescricao: vi.fn(),
    };
    const service = new InsumoRecebimentoDecisaoHistoricaService({
      mapeamentoRepository: {} as never,
      pendenciaRepository: pendenciaRepository as never,
    });

    const resultado = await service.produtoFoiIgnoradoAnteriormente({
      empresaId: 'emp-1',
      omieIdProduto: 500,
      descricaoProduto: 'Forminhas',
    });

    expect(resultado).toBe(true);
    expect(pendenciaRepository.existsIgnoradoPorDescricao).not.toHaveBeenCalled();
  });

  it('detecta produto ignorado pela descrição quando id Omie é diferente', async () => {
    const pendenciaRepository = {
      existsIgnoradoPorProdutoOmie: vi.fn().mockResolvedValue(false),
      existsIgnoradoPorDescricao: vi.fn().mockResolvedValue(true),
    };
    const service = new InsumoRecebimentoDecisaoHistoricaService({
      mapeamentoRepository: {} as never,
      pendenciaRepository: pendenciaRepository as never,
    });

    const resultado = await service.produtoFoiIgnoradoAnteriormente({
      empresaId: 'emp-1',
      omieIdProduto: 999,
      descricaoProduto: 'FORMINHAS EMPADA 50ML C/800 MELLO',
    });

    expect(resultado).toBe(true);
    expect(pendenciaRepository.existsIgnoradoPorDescricao).toHaveBeenCalledWith(
      'emp-1',
      'FORMINHAS EMPADA 50ML C/800 MELLO',
    );
  });

  it('replica vínculo existente para novo id Omie com mesmo nome', async () => {
    const mapeamentoRepository = {
      findAtivoByDescricaoOmie: vi.fn().mockResolvedValue(mapeamentoBase),
      create: vi.fn().mockResolvedValue({
        ...mapeamentoBase,
        id: 'map-2',
        omie_id_produto: 777,
      }),
    };
    const service = new InsumoRecebimentoDecisaoHistoricaService({
      mapeamentoRepository: mapeamentoRepository as never,
      pendenciaRepository: {} as never,
    });

    const resultado = await service.resolverMapeamentoPorDescricao({
      empresaId: 'emp-1',
      omieIdProduto: 777,
      omieCodigoProduto: 'FORM-001',
      descricaoProduto: 'Farinha Especial',
    });

    expect(mapeamentoRepository.create).toHaveBeenCalledWith({
      empresaId: 'emp-1',
      omieIdProduto: 777,
      omieCodigoProduto: 'FORM-001',
      insumoId: 'insumo-1',
      fatorConversao: 25,
      descricaoOmie: 'Farinha Especial',
    });
    expect(resultado?.omie_id_produto).toBe(777);
  });
});
