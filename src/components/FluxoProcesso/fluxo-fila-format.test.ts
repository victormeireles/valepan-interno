import { describe, expect, it } from 'vitest';
import type { FluxoFilaItem } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { formatFilaResumoQty, formatPresoDuracao } from './fluxo-fila-format';

describe('formatPresoDuracao', () => {
  it('minutos curtos', () => {
    expect(formatPresoDuracao(42)).toBe('42 min');
  });
  it('horas e minutos', () => {
    expect(formatPresoDuracao(135)).toBe('2 h 15 min');
  });
});

function stubLtScale(): Pick<FluxoDisplayScale, 'fromUn' | 'unitLabel'> {
  return {
    unitLabel: 'LT',
    fromUn(un, assadeiraNome) {
      if (assadeiraNome === 'A20') return un / 20;
      if (assadeiraNome === 'B40') return un / 40;
      return un / 30;
    },
  };
}

function item(
  partial: Pick<FluxoFilaItem, 'volumeUn' | 'assadeiraNome' | 'preso'> &
    Partial<FluxoFilaItem>,
): FluxoFilaItem {
  return {
    ordemProducaoId: partial.ordemProducaoId ?? 'op',
    ordemPlanejamento: partial.ordemPlanejamento ?? 1,
    produtoNome: partial.produtoNome ?? 'Bun',
    ultimoLoteEm: partial.ultimoLoteEm ?? null,
    presoMin: partial.presoMin ?? null,
    ...partial,
  };
}

describe('formatFilaResumoQty', () => {
  const scale = stubLtScale() as FluxoDisplayScale;
  const items = [
    item({ volumeUn: 100, assadeiraNome: 'A20', preso: true }),
    item({ volumeUn: 80, assadeiraNome: 'B40', preso: false, ordemProducaoId: 'op-2' }),
  ];

  it('soma conversão por item, não o fator médio do total', () => {
    expect(formatFilaResumoQty(items, scale)).toBe('7 LT');
  });

  it('presoOnly soma só itens presos, cada um no próprio fator', () => {
    expect(formatFilaResumoQty(items, scale, { presoOnly: true })).toBe('5 LT');
  });
});
