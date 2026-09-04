import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/data/insumos/InsumoEstoqueRepository', () => ({
  insumoEstoqueRepository: {},
  InsumoEstoqueRepository: class {},
}));
vi.mock('@/data/insumos/InsumoMapeamentoRepository', () => ({
  insumoMapeamentoRepository: {},
  InsumoMapeamentoRepository: class {},
}));
vi.mock('@/data/insumos/InsumoPendenciaRepository', () => ({
  insumoPendenciaRepository: {},
  InsumoPendenciaRepository: class {},
}));
vi.mock('@/data/insumos/InsumoFornecedorIgnoradoRepository', () => ({
  insumoFornecedorIgnoradoRepository: {},
  InsumoFornecedorIgnoradoRepository: class {},
}));
vi.mock('@/data/omie/OmieWebhookEventoRepository', () => ({
  omieWebhookEventoRepository: {},
  OmieWebhookEventoRepository: class {},
}));
vi.mock('@/lib/clients/omie-recebimento-client', () => ({
  omieRecebimentoClient: {},
  OmieRecebimentoClient: class {},
}));
vi.mock('@/lib/services/insumo-pedido-compra-manager', () => ({
  insumoPedidoCompraManager: { abaterPorEntradaNf: vi.fn() },
}));

import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import type { IntegracaoInsumoRow } from '@/domain/types/insumo-estoque-db';
import type { OmieWebhookEventoRow } from '@/data/omie/OmieWebhookEventoRepository';

const { InsumoEstoqueService } = await import('./insumo-estoque-service');
const { InsumoRecebimentoProcessor } = await import('./insumo-recebimento-processor');

const consultarRecebimento = vi.fn();
const findEmpresaByAppKey = vi.fn();
const findByEmpresaProduto = vi.fn();
const createPendente = vi.fn();
const marcarIgnorado = vi.fn();
const existsByCnpj = vi.fn();
const registrarEntrada = vi.fn();
const resolverCategoriaRecebimento = vi.fn();
const resolverCategoriaItem = vi.fn();
const produtoFoiIgnoradoAnteriormente = vi.fn();
const resolverMapeamentoPorDescricao = vi.fn();

const categoriaService = {
  resolverCategoriaRecebimento,
  resolverCategoriaItem,
};

const decisaoHistoricaService = {
  produtoFoiIgnoradoAnteriormente,
  resolverMapeamentoPorDescricao,
};

const fornecedorIgnoradoRepository = {
  existsByCnpj,
};

const processor = new InsumoRecebimentoProcessor({
  client: { consultarRecebimento },
  webhookRepository: { findEmpresaByAppKey } as never,
  mapeamentoRepository: { findByEmpresaProduto } as never,
  pendenciaRepository: { createPendente, marcarIgnorado } as never,
  estoqueService: { registrarEntrada } as never,
  categoriaService: categoriaService as never,
  decisaoHistoricaService: decisaoHistoricaService as never,
  fornecedorIgnoradoRepository: fornecedorIgnoradoRepository as never,
});

const eventoBase: OmieWebhookEventoRow = {
  id: 'evt-1',
  app_key_recebida: 'app-key-1',
  created_at: '2026-06-19T10:00:00Z',
  empresa_id: 'emp-1',
  erro: null,
  message_id: null,
  payload_json: {
    appKey: 'app-key-1',
    event: { cabecalho: { nIdReceb: 999 } },
  },
  processed_at: null,
  received_at: '2026-06-19T10:00:00Z',
  status_processamento: 'recebido',
  topic: 'RecebimentoProduto.Concluido',
  updated_at: '2026-06-19T10:00:00Z',
};

const itemBase: OmieRecebimentoItem = {
  nIdItem: 10,
  nIdProduto: 500,
  cCodigoProduto: 'FAR-001',
  cDescricaoProduto: 'Farinha',
  cUnidadeNfe: 'KG',
  nQtdeNfe: 100,
  nPrecoUnit: 5,
  vTotalItem: 500,
  cIgnorarItem: 'N',
  cfopEntrada: null,
  ncm: null,
  categoriaItem: null,
};

const mapeamentoBase: IntegracaoInsumoRow = {
  id: 'map-1',
  empresa_id: 'emp-1',
  omie_id_produto: 500,
  omie_codigo_produto: 'FAR-001',
  insumo_id: 'insumo-1',
  fator_conversao: 1,
  descricao_omie: 'Farinha',
  ativo: true,
  created_at: '2026-06-19T10:00:00Z',
  updated_at: '2026-06-19T10:00:00Z',
};

describe('InsumoRecebimentoProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findEmpresaByAppKey.mockResolvedValue({
      id: 'emp-1',
      nome: 'Valepan',
      app_key: 'app-key-1',
      app_secret: 'secret-1',
    });
    consultarRecebimento.mockResolvedValue({
      cabec: {
        cNumeroNF: '12345',
        dDataEmissao: '2026-06-18',
        fornecedorCnpj: '11.725.898/0001-81',
      },
      infoAdicionais: { cCategCompra: '2.01.01' },
      itensCabec: [itemBase],
    });
    resolverCategoriaRecebimento.mockResolvedValue({
      codigo: '2.01.01',
      descricao: 'Compras de Mercadorias para Revenda',
    });
    resolverCategoriaItem.mockResolvedValue({
      codigo: '2.01.01',
      descricao: 'Compras de Mercadorias para Revenda',
    });
    findByEmpresaProduto.mockResolvedValue(mapeamentoBase);
    createPendente.mockResolvedValue({ id: 'pend-1' });
    marcarIgnorado.mockResolvedValue(undefined);
    existsByCnpj.mockResolvedValue(false);
    registrarEntrada.mockResolvedValue(true);
    produtoFoiIgnoradoAnteriormente.mockResolvedValue(false);
    resolverMapeamentoPorDescricao.mockResolvedValue(null);
  });

  it('com mapeamento chama registrarEntrada uma vez', async () => {
    await processor.processarEvento(eventoBase);

    expect(registrarEntrada).toHaveBeenCalledTimes(1);
    expect(registrarEntrada).toHaveBeenCalledWith({
      insumoId: 'insumo-1',
      empresaId: 'emp-1',
      quantidadeEntrada: 100,
      custoUnitario: 5,
      origem: 'entrada_nf',
      omieNIdReceb: 999,
      omieNIdItem: 10,
      omieWebhookEventoId: 'evt-1',
      numeroNf: '12345',
    });
    expect(createPendente).not.toHaveBeenCalled();
  });

  it('sem mapeamento cria pendência', async () => {
    findByEmpresaProduto.mockResolvedValue(null);

    await processor.processarEvento(eventoBase);

    expect(createPendente).toHaveBeenCalledTimes(1);
    expect(createPendente).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 'emp-1',
        omieIdProduto: 500,
        descricaoProduto: 'Farinha',
      }),
    );
    expect(registrarEntrada).not.toHaveBeenCalled();
  });

  it('sem mapeamento mas com histórico ignorado cria pendência já ignorada', async () => {
    findByEmpresaProduto.mockResolvedValue(null);
    produtoFoiIgnoradoAnteriormente.mockResolvedValue(true);

    await processor.processarEvento(eventoBase);

    expect(createPendente).toHaveBeenCalledTimes(1);
    expect(marcarIgnorado).toHaveBeenCalledWith('pend-1');
    expect(existsByCnpj).not.toHaveBeenCalled();
    expect(registrarEntrada).not.toHaveBeenCalled();
  });

  it('sem mapeamento/histórico e CNPJ na lista cria pendência já ignorada', async () => {
    findByEmpresaProduto.mockResolvedValue(null);
    existsByCnpj.mockResolvedValue(true);

    await processor.processarEvento(eventoBase);

    expect(existsByCnpj).toHaveBeenCalledWith('emp-1', '11725898000181');
    expect(createPendente).toHaveBeenCalledTimes(1);
    expect(marcarIgnorado).toHaveBeenCalledWith('pend-1');
    expect(registrarEntrada).not.toHaveBeenCalled();
  });

  it('sem mapeamento/histórico e CNPJ fora da lista só cria pendência', async () => {
    findByEmpresaProduto.mockResolvedValue(null);
    existsByCnpj.mockResolvedValue(false);

    await processor.processarEvento(eventoBase);

    expect(existsByCnpj).toHaveBeenCalledWith('emp-1', '11725898000181');
    expect(createPendente).toHaveBeenCalledTimes(1);
    expect(marcarIgnorado).not.toHaveBeenCalled();
    expect(registrarEntrada).not.toHaveBeenCalled();
  });

  it('sem mapeamento por id usa vínculo histórico por descrição', async () => {
    findByEmpresaProduto.mockResolvedValue(null);
    resolverMapeamentoPorDescricao.mockResolvedValue({
      ...mapeamentoBase,
      omie_id_produto: 500,
    });

    await processor.processarEvento(eventoBase);

    expect(registrarEntrada).toHaveBeenCalledTimes(1);
    expect(createPendente).not.toHaveBeenCalled();
  });

  it('ignora item com cIgnorarItem = S', async () => {
    consultarRecebimento.mockResolvedValue({
      cabec: { cNumeroNF: '12345' },
      itensCabec: [{ ...itemBase, cIgnorarItem: 'S' }],
    });

    await processor.processarEvento(eventoBase);

    expect(registrarEntrada).not.toHaveBeenCalled();
    expect(createPendente).not.toHaveBeenCalled();
  });

  it('item duplicado não grava movimento de novo', async () => {
    const repoMock = {
      movimentoEntradaJaExiste: vi.fn().mockResolvedValue(true),
      findSaldo: vi.fn(),
      upsertSaldo: vi.fn(),
      insertMovimento: vi.fn(),
      updateInsumoCustoUnitario: vi.fn(),
      findInsumoCustoUnitario: vi.fn(),
    };

    const serviceIdempotente = new InsumoEstoqueService(repoMock as never);
    const processorIdempotente = new InsumoRecebimentoProcessor({
      client: { consultarRecebimento },
      webhookRepository: { findEmpresaByAppKey } as never,
      mapeamentoRepository: { findByEmpresaProduto } as never,
      pendenciaRepository: { createPendente, marcarIgnorado } as never,
      estoqueService: serviceIdempotente,
      categoriaService: categoriaService as never,
      decisaoHistoricaService: decisaoHistoricaService as never,
      fornecedorIgnoradoRepository: fornecedorIgnoradoRepository as never,
    });

    await processorIdempotente.processarEvento(eventoBase);

    expect(repoMock.movimentoEntradaJaExiste).toHaveBeenCalledWith('emp-1', 999, 10);
    expect(repoMock.upsertSaldo).not.toHaveBeenCalled();
    expect(repoMock.insertMovimento).not.toHaveBeenCalled();
    expect(repoMock.updateInsumoCustoUnitario).not.toHaveBeenCalled();
  });
});
