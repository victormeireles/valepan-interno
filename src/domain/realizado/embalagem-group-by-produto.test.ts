import { describe, expect, it } from 'vitest';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import type { EmbalagemGroupRow } from './embalagem-group-by-produto';
import {
  groupEmbalagemItemsByProduto,
  hasEmbalagemQuantity,
  latestEmbalagemHorarioHHmm,
} from './embalagem-group-by-produto';

/** Linha de teste com defaults mínimos; sobrescreva só o necessário. */
function row(partial: Partial<EmbalagemGroupRow> & Pick<EmbalagemGroupRow, 'produto'>): EmbalagemGroupRow {
  return {
    produzido: 0,
    aProduzir: 0,
    unidade: 'cx',
    congelado: 'Não',
    ...partial,
  };
}

describe('hasEmbalagemQuantity', () => {
  it('retorna false quando não há quantidade embalada', () => {
    expect(hasEmbalagemQuantity({})).toBe(false);
    expect(hasEmbalagemQuantity({ caixas: 0 })).toBe(false);
    expect(hasEmbalagemQuantity({ caixas: 0, pacotes: 0, unidades: 0, kg: 0 })).toBe(false);
  });

  it('retorna true se qualquer campo de quantidade for positivo', () => {
    expect(hasEmbalagemQuantity({ caixas: 1 })).toBe(true);
    expect(hasEmbalagemQuantity({ pacotes: 2 })).toBe(true);
    expect(hasEmbalagemQuantity({ unidades: 3 })).toBe(true);
    expect(hasEmbalagemQuantity({ kg: 0.5 })).toBe(true);
  });
});

describe('latestEmbalagemHorarioHHmm', () => {
  it('retorna undefined para lista vazia', () => {
    expect(latestEmbalagemHorarioHHmm([])).toBeUndefined();
  });

  it('ignora lotes sem quantidade embalada', () => {
    const lots = [
      row({ produto: 'A', producaoUpdatedAt: '2025-06-01T18:00:00.000Z' }),
      row({ produto: 'A', caixas: 1, producaoUpdatedAt: '2025-06-01T12:00:00.000Z' }),
    ];
    expect(latestEmbalagemHorarioHHmm(lots)).toBe(formatLocalTimeHHmm('2025-06-01T12:00:00.000Z'));
  });

  it('escolhe o producaoUpdatedAt mais recente entre lotes com quantidade', () => {
    const older = '2025-06-01T08:00:00.000Z';
    const newer = '2025-06-01T20:00:00.000Z';
    const lots = [
      row({ produto: 'A', caixas: 1, producaoUpdatedAt: older }),
      row({ produto: 'A', pacotes: 1, producaoUpdatedAt: newer }),
    ];
    expect(latestEmbalagemHorarioHHmm(lots)).toBe(formatLocalTimeHHmm(newer));
  });

  it('retorna undefined se timestamp inválido ou ausente nos lotes com quantidade', () => {
    expect(
      latestEmbalagemHorarioHHmm([row({ produto: 'A', caixas: 1, producaoUpdatedAt: 'invalid' })])
    ).toBeUndefined();
    expect(latestEmbalagemHorarioHHmm([row({ produto: 'A', caixas: 1 })])).toBeUndefined();
  });
});

describe('groupEmbalagemItemsByProduto', () => {
  it('retorna array vazio para entrada vazia', () => {
    expect(groupEmbalagemItemsByProduto([])).toEqual([]);
  });

  it('preserva ordem pela primeira aparição do produto', () => {
    const items = [
      row({ produto: 'Brioche', rowId: 2 }),
      row({ produto: 'Toast', rowId: 1 }),
      row({ produto: 'Brioche', rowId: 3 }),
    ];
    const groups = groupEmbalagemItemsByProduto(items);
    expect(groups.map((g) => g.produto)).toEqual(['Brioche', 'Toast']);
    expect(groups[0]!.lots).toHaveLength(2);
    expect(groups[1]!.lots).toHaveLength(1);
  });

  it('agrega somas e pedidos por produto', () => {
    const items = [
      row({
        produto: 'P1',
        produzido: 10,
        aProduzir: 5,
        caixas: 2,
        pacotes: 1,
        unidades: 3,
        kg: 1,
        pedidoCaixas: 4,
        pedidoPacotes: 2,
        pedidoUnidades: 6,
        pedidoKg: 2,
      }),
      row({
        produto: 'P1',
        produzido: 20,
        aProduzir: 7,
        caixas: 1,
        pacotes: 2,
      }),
    ];
    const [g] = groupEmbalagemItemsByProduto(items);
    expect(g).toMatchObject({
      produto: 'P1',
      somaProduzido: 30,
      somaAProduzir: 12,
      somaCaixas: 3,
      somaPacotes: 3,
      somaUnidades: 3,
      somaKg: 1,
      somaPedidoCaixas: 4,
      somaPedidoPacotes: 2,
      somaPedidoUnidades: 6,
      somaPedidoKg: 2,
    });
  });

  it('algumCongelado é true quando qualquer lote está congelado', () => {
    const apenasFresco = groupEmbalagemItemsByProduto([
      row({ produto: 'X', congelado: 'Não' }),
      row({ produto: 'X', congelado: 'Não' }),
    ]);
    expect(apenasFresco[0]!.algumCongelado).toBe(false);

    const misto = groupEmbalagemItemsByProduto([
      row({ produto: 'Y', congelado: 'Não' }),
      row({ produto: 'Y', congelado: 'Sim' }),
    ]);
    expect(misto[0]!.algumCongelado).toBe(true);
  });

  it('horarioMaisRecente usa lotes com quantidade embalada', () => {
    const isoVelho = '2025-03-01T10:00:00.000Z';
    const isoNovo = '2025-03-01T16:00:00.000Z';
    const [g] = groupEmbalagemItemsByProduto([
      row({ produto: 'Z', producaoUpdatedAt: isoNovo }),
      row({ produto: 'Z', caixas: 1, producaoUpdatedAt: isoVelho }),
    ]);
    expect(g!.horarioMaisRecente).toBe(formatLocalTimeHHmm(isoVelho));
  });
});
