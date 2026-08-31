import { describe, expect, it } from 'vitest';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';
import { buildSugestaoPedidoPrefill } from './insumo-compra-sugestao-pedido-prefill';

function linha(
  overrides: Partial<InsumoCompraSugestaoLinha> = {},
): InsumoCompraSugestaoLinha {
  return {
    insumoId: 'acido',
    nome: 'Ácido Ascórbico',
    unidade: 'kg',
    conversao: null,
    estoque: 0,
    consumoDiario: 3.8,
    coberturaAtualDias: 1,
    leadTimeDias: 3,
    quantidadeSugerida: 260.42496,
    status: 'pedir_hoje',
    motivo: '',
    distribuidorPreferencial: 'PANTEC',
    distribuidoresAlternativos: [],
    pipeline: null,
    ...overrides,
  };
}

describe('buildSugestaoPedidoPrefill', () => {
  it('arredonda a quantidade igual à listagem (≥5 vira inteiro)', () => {
    const prefill = buildSugestaoPedidoPrefill(linha(), '2026-08-31');

    expect(prefill.itens[0]?.quantidade).toBe(260);
  });

  it('arredonda quantidade pequena (<5) com uma casa decimal', () => {
    const prefill = buildSugestaoPedidoPrefill(
      linha({ quantidadeSugerida: 3.84 }),
      '2026-08-31',
    );

    expect(prefill.itens[0]?.quantidade).toBe(3.8);
  });

  it('deixa quantidade 0 quando a sugestão é nula ou não positiva', () => {
    expect(
      buildSugestaoPedidoPrefill(linha({ quantidadeSugerida: null }), '2026-08-31')
        .itens[0]?.quantidade,
    ).toBe(0);
    expect(
      buildSugestaoPedidoPrefill(linha({ quantidadeSugerida: 0 }), '2026-08-31')
        .itens[0]?.quantidade,
    ).toBe(0);
  });
});
