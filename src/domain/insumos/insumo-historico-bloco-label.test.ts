import { describe, expect, it } from 'vitest';
import type { InsumoMovimentoOrigem, InsumoMovimentoRecord } from '@/domain/types/insumo-estoque';
import {
  formatarRotuloBlocoSaida,
  InsumoHistoricoBlocoResumoBuilder,
} from './insumo-historico-bloco-label';

function movimento(
  createdAt: string,
  origem: InsumoMovimentoOrigem = 'producao_fermentacao',
): InsumoMovimentoRecord {
  return {
    id: createdAt,
    createdAt,
    insumoId: 'ins-1',
    deltaQuantidade: -10,
    saldoResultante: 0,
    custoUnitario: 1,
    origem,
    numeroNf: null,
    observacao: null,
  };
}

describe('formatarRotuloBlocoSaida', () => {
  it('resume lotes do mesmo dia no formato operacional', () => {
    expect(
      formatarRotuloBlocoSaida([
        movimento('2026-08-18T15:13:00-03:00'),
        movimento('2026-08-18T14:35:00-03:00'),
      ]),
    ).toBe('2 lotes entre 14h35 e 15h13');
  });

  it('usa o mais antigo e o mais recente do bloco', () => {
    expect(
      formatarRotuloBlocoSaida([
        movimento('2026-08-18T12:10:00-03:00'),
        movimento('2026-08-18T10:00:00-03:00'),
        movimento('2026-08-18T11:00:00-03:00'),
        movimento('2026-08-18T09:00:00-03:00'),
        movimento('2026-08-18T08:35:00-03:00'),
      ]),
    ).toBe('5 lotes entre 8h35 e 12h10');
  });

  it('inclui a data curta quando o bloco atravessa o dia civil', () => {
    expect(
      formatarRotuloBlocoSaida([
        movimento('2026-08-19T01:10:00-03:00'),
        movimento('2026-08-18T22:00:00-03:00'),
      ]),
    ).toBe('2 lotes entre 18/08 22h00 e 19/08 1h10');
  });
});

describe('InsumoHistoricoBlocoResumoBuilder', () => {
  it('soma o delta e usa o saldo da saída mais recente', () => {
    const resumo = new InsumoHistoricoBlocoResumoBuilder().build([
      {
        ...movimento('2026-08-18T15:13:00-03:00'),
        deltaQuantidade: -8,
        saldoResultante: 80,
      },
      {
        ...movimento('2026-08-18T14:35:00-03:00'),
        deltaQuantidade: -12,
        saldoResultante: 88,
      },
    ]);

    expect(resumo.deltaQuantidade).toBe(-20);
    expect(resumo.saldoResultante).toBe(80);
    expect(resumo.origemBadge).toBe('producao_fermentacao');
  });

  it('marca origem mista quando o bloco mistura etapas', () => {
    const resumo = new InsumoHistoricoBlocoResumoBuilder().build([
      movimento('2026-08-18T11:00:00-03:00', 'producao_forno'),
      movimento('2026-08-18T10:00:00-03:00', 'producao_fermentacao'),
    ]);
    expect(resumo.origemBadge).toBe('producao');
  });
});
