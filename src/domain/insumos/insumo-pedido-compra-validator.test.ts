import { describe, expect, it } from 'vitest';
import type { ValidarPedidoCompraInput } from './insumo-pedido-compra-types';
import { InsumoPedidoCompraValidator } from './insumo-pedido-compra-validator';

const validator = new InsumoPedidoCompraValidator();

function base(
  overrides: Partial<ValidarPedidoCompraInput> = {},
): ValidarPedidoCompraInput {
  return {
    fornecedorNome: 'Fornecedor X',
    dataChegadaPrevista: '2026-09-10',
    itens: [{ insumoId: 'ins-1', quantidade: 10 }],
    ...overrides,
  };
}

describe('InsumoPedidoCompraValidator', () => {
  it('fornecedor em branco → Informe o fornecedor.', () => {
    expect(validator.validar(base({ fornecedorNome: '   ' }))).toBe(
      'Informe o fornecedor.',
    );
  });

  it('data vazia → Informe a data de chegada.', () => {
    expect(validator.validar(base({ dataChegadaPrevista: '' }))).toBe(
      'Informe a data de chegada.',
    );
  });

  it('zero linhas → Inclua pelo menos um insumo.', () => {
    expect(validator.validar(base({ itens: [] }))).toBe(
      'Inclua pelo menos um insumo.',
    );
  });

  it('qtd ≤ 0 → Quantidade deve ser maior que zero.', () => {
    expect(
      validator.validar(
        base({ itens: [{ insumoId: 'ins-1', quantidade: 0 }] }),
      ),
    ).toBe('Quantidade deve ser maior que zero.');
  });

  it('insumo repetido → O mesmo insumo não pode aparecer duas vezes.', () => {
    expect(
      validator.validar(
        base({
          itens: [
            { insumoId: 'ins-1', quantidade: 5 },
            { insumoId: 'ins-1', quantidade: 3 },
          ],
        }),
      ),
    ).toBe('O mesmo insumo não pode aparecer duas vezes.');
  });

  it('válido → null', () => {
    expect(
      validator.validar(
        base({
          itens: [
            { insumoId: 'ins-1', quantidade: 5 },
            { insumoId: 'ins-2', quantidade: 3 },
          ],
        }),
      ),
    ).toBeNull();
  });
});
