import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/insumos/InsumoPedidoCompraRepository', () => ({
  insumoPedidoCompraRepository: {},
  InsumoPedidoCompraRepository: class {},
}));
vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {},
}));

import { InsumoPedidoCompraManager } from './insumo-pedido-compra-manager';

describe('InsumoPedidoCompraManager', () => {
  const list = vi.fn();
  const getById = vi.fn();
  const insert = vi.fn();
  const replaceAberto = vi.fn();
  const updateStatus = vi.fn();
  const listInsumoOpcoes = vi.fn();
  const listPipelineAberto = vi.fn();

  let manager: InsumoPedidoCompraManager;

  const pedidoAberto = {
    id: 'pedido-1',
    numero: 47,
    fornecedor_nome: 'Fornecedor A',
    data_chegada_prevista: '2026-09-10',
    status: 'aberto' as const,
    observacao: null,
    criado_por: null,
    created_at: '2026-08-31T12:00:00.000Z',
    updated_at: '2026-08-31T12:00:00.000Z',
    itens: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    getById.mockResolvedValue(null);
    insert.mockResolvedValue(pedidoAberto);
    replaceAberto.mockResolvedValue(pedidoAberto);
    updateStatus.mockResolvedValue(undefined);
    listInsumoOpcoes.mockResolvedValue([]);
    listPipelineAberto.mockResolvedValue([]);

    manager = new InsumoPedidoCompraManager({
      repository: {
        list,
        getById,
        insert,
        replaceAberto,
        updateStatus,
        listInsumoOpcoes,
        listPipelineAberto,
      },
    });
  });

  it('save inválido não chama insert', async () => {
    await expect(
      manager.salvar({
        fornecedorNome: '',
        dataChegadaPrevista: '2026-09-10',
        itens: [{ insumoId: 'insumo-1', quantidade: 10 }],
      }),
    ).rejects.toThrow('Informe o fornecedor.');

    expect(insert).not.toHaveBeenCalled();
    expect(replaceAberto).not.toHaveBeenCalled();
  });

  it('save sem id chama insert', async () => {
    await manager.salvar({
      fornecedorNome: 'Fornecedor A',
      dataChegadaPrevista: '2026-09-10',
      observacao: null,
      criadoPor: 'user-1',
      itens: [{ insumoId: 'insumo-1', quantidade: 10 }],
    });

    expect(insert).toHaveBeenCalledWith({
      fornecedorNome: 'Fornecedor A',
      dataChegadaPrevista: '2026-09-10',
      observacao: null,
      criadoPor: 'user-1',
      itens: [{ insumoId: 'insumo-1', quantidade: 10 }],
    });
    expect(replaceAberto).not.toHaveBeenCalled();
  });

  it('save de encerrado lança erro e não chama replace', async () => {
    getById.mockResolvedValue({ ...pedidoAberto, status: 'encerrado' });

    await expect(
      manager.salvar({
        id: 'pedido-1',
        fornecedorNome: 'Fornecedor A',
        dataChegadaPrevista: '2026-09-10',
        itens: [{ insumoId: 'insumo-1', quantidade: 10 }],
      }),
    ).rejects.toThrow('Pedido encerrado ou cancelado não pode ser editado.');

    expect(replaceAberto).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('encerrar em aberto chama updateStatus com encerrado', async () => {
    getById.mockResolvedValue(pedidoAberto);

    await manager.encerrar('pedido-1');

    expect(updateStatus).toHaveBeenCalledWith('pedido-1', 'encerrado');
  });
});
