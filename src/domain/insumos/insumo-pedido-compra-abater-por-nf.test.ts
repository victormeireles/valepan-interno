import { describe, expect, it } from 'vitest';
import {
  JANELA_ABATIMENTO_PEDIDO_DIAS,
  escolherPedidoParaAbaterPorNf,
} from './insumo-pedido-compra-abater-por-nf';

describe('escolherPedidoParaAbaterPorNf', () => {
  const hoje = '2026-09-04';

  it('escolhe o mais antigo na janela hoje+3', () => {
    const id = escolherPedidoParaAbaterPorNf(
      [
        { id: 'b', dataChegadaPrevista: '2026-09-06', numero: 2 },
        { id: 'a', dataChegadaPrevista: '2026-09-03', numero: 1 },
        { id: 'c', dataChegadaPrevista: '2026-09-08', numero: 3 }, // fora
      ],
      hoje,
    );
    expect(id).toBe('a');
    expect(JANELA_ABATIMENTO_PEDIDO_DIAS).toBe(3);
  });

  it('empate de data → menor numero', () => {
    const id = escolherPedidoParaAbaterPorNf(
      [
        { id: 'x', dataChegadaPrevista: '2026-09-05', numero: 10 },
        { id: 'y', dataChegadaPrevista: '2026-09-05', numero: 4 },
      ],
      hoje,
    );
    expect(id).toBe('y');
  });

  it('inclui chegada = hoje+3 e exclui hoje+4', () => {
    expect(
      escolherPedidoParaAbaterPorNf(
        [{ id: 'limite', dataChegadaPrevista: '2026-09-07', numero: 1 }],
        hoje,
      ),
    ).toBe('limite');
    expect(
      escolherPedidoParaAbaterPorNf(
        [{ id: 'fora', dataChegadaPrevista: '2026-09-08', numero: 1 }],
        hoje,
      ),
    ).toBeNull();
  });

  it('lista vazia → null', () => {
    expect(escolherPedidoParaAbaterPorNf([], hoje)).toBeNull();
  });
});
