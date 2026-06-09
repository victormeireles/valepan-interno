import { describe, expect, it } from 'vitest';
import { loteToPedidoKey } from './pedido-key-from-lote';

describe('loteToPedidoKey', () => {
  it('maps lote fields to pedido natural key', () => {
    const key = loteToPedidoKey({
      dataPedido: '2026-06-03',
      dataFabricacao: '2026-06-04',
      tipoEstoqueId: 'tipo-1',
      produtoId: 'prod-1',
      observacaoCliente: '  obs cliente  ',
      assadeiraId: 'ass-1',
    });
    expect(key).toEqual({
      dataProducao: '2026-06-03',
      dataFabricacaoEtiqueta: '2026-06-04',
      tipoEstoqueId: 'tipo-1',
      produtoId: 'prod-1',
      observacao: 'obs cliente',
      assadeiraId: 'ass-1',
    });
  });

  it('empty observacao becomes empty string', () => {
    const key = loteToPedidoKey({
      dataPedido: '2026-06-03',
      dataFabricacao: '2026-06-04',
      tipoEstoqueId: 't',
      produtoId: 'p',
      observacaoCliente: '',
      assadeiraId: 'ass-1',
    });
    expect(key.observacao).toBe('');
  });
});
