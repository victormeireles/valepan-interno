import { describe, expect, it } from 'vitest';

import {
  insumoCompraNomeNormalizer,
  INSUMO_COMPRA_SEED_PLANILHA,
} from './insumo-compra-seed-planilha';

describe('INSUMO_COMPRA_SEED_PLANILHA', () => {
  it('codifica todas as 30 regras da planilha com nomes normalizados', () => {
    expect(INSUMO_COMPRA_SEED_PLANILHA).toHaveLength(30);
    expect(
      INSUMO_COMPRA_SEED_PLANILHA.every(
        (regra) => regra.nomeNormalizado === insumoCompraNomeNormalizer.normalize(regra.nome),
      ),
    ).toBe(true);
  });

  it('preserva limites, janela e prioridade dos distribuidores', () => {
    expect(
      INSUMO_COMPRA_SEED_PLANILHA.find((regra) => regra.nome === 'Farinha de trigo'),
    ).toMatchObject({
      nomeNormalizado: 'farinha de trigo',
      leadTimeDias: 7,
      janelaTipo: 'dias_semana',
      diasSemana: [1],
      quantidadeMinima: 30_000,
      quantidadeMaxima: 30_000,
      distribuidores: [
        { nome: 'DOUGLAS', preferencial: true },
      ],
    });

    expect(INSUMO_COMPRA_SEED_PLANILHA.find((regra) => regra.nome === 'Glúten')?.distribuidores)
      .toEqual([
        { nome: 'DAXIA', preferencial: true },
        { nome: 'PANTEC', preferencial: false },
      ]);
  });
});
