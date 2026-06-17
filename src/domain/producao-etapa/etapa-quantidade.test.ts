import { describe, expect, it } from 'vitest';
import {
  somarLotesEtapa,
  derivarEscalarEtapa,
  calcularSaldoEtapa,
  type EtapaQuantidade,
} from './etapa-quantidade';

describe('etapa-quantidade', () => {
  it('soma assadeiras de lotes', () => {
    const total = somarLotesEtapa([
      { assadeiras: 2, unidades: 0 },
      { assadeiras: 3, unidades: 0 },
    ]);
    expect(total).toEqual({ assadeiras: 5, unidades: 0 });
  });

  it('derivar escalar LT quando meta tem assadeira', () => {
    expect(
      derivarEscalarEtapa(
        { assadeiras: 10, unidades: 240 },
        { assadeiras: 4, unidades: 0 },
        'assadeiras',
      ),
    ).toEqual({ unidade: 'lt', aProduzir: 10, produzido: 4 });
  });

  it('calcular saldo', () => {
    const meta: EtapaQuantidade = { assadeiras: 10, unidades: 0 };
    const produzido: EtapaQuantidade = { assadeiras: 3, unidades: 0 };
    expect(calcularSaldoEtapa(meta, produzido, 'assadeiras')).toBe(7);
  });
});
