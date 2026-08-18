import { describe, expect, it } from 'vitest';
import type { FluxoFilaItem } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { formatAcimaDoPrazoLinha, formatFilaResumoQty, formatNaFilaBadge, formatNenhumAcimaDoPrazo, formatPresoDuracao, FluxoFilaEmbaladoCopy } from './fluxo-fila-format';

describe('formatPresoDuracao', () => {
  it('minutos curtos', () => {
    expect(formatPresoDuracao(42)).toBe('42 min');
  });
  it('horas e minutos', () => {
    expect(formatPresoDuracao(135)).toBe('2 h 15 min');
  });
  it('hora cheia', () => {
    expect(formatPresoDuracao(180)).toBe('3 h');
  });
});

describe('formatAcimaDoPrazoLinha', () => {
  it('inclui o prazo configurado', () => {
    expect(formatAcimaDoPrazoLinha('242 LT', 180)).toBe('242 LT acima do prazo de 3 h');
    expect(formatAcimaDoPrazoLinha('80 LT', 60)).toBe('80 LT acima do prazo de 1 h');
    expect(formatNenhumAcimaDoPrazo(180)).toBe('Nenhum acima do prazo de 3 h');
  });
});

describe('formatNaFilaBadge', () => {
  it('mostra tempo na câmara, não o atraso', () => {
    expect(formatNaFilaBadge(326, 'fermentando')).toBe('há 5 h 26 min na câmara');
  });
  it('mostra tempo no resfriamento', () => {
    expect(formatNaFilaBadge(75, 'resfriando')).toBe('há 1 h 15 min no resfriamento');
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
    observacao: partial.observacao ?? '',
    naFilaMin: partial.naFilaMin ?? null,
    ultimoLoteEm: partial.ultimoLoteEm ?? null,
    dataOp: partial.dataOp ?? '2026-08-12',
    origem: partial.origem ?? 'op_do_dia',
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

  it('soma só origem do dia no total do tile', () => {
    const mixed = [
      item({ volumeUn: 100, assadeiraNome: 'A20', preso: false, origem: 'op_do_dia' }),
      item({
        volumeUn: 80,
        assadeiraNome: 'A20',
        preso: false,
        origem: 'op_anterior',
        dataOp: '2026-08-17',
      }),
    ];
    expect(formatFilaResumoQty(mixed, scale, { origem: 'op_do_dia' })).toBe('5 LT');
    expect(formatFilaResumoQty(mixed, scale, { origem: 'nao_do_dia' })).toBe('4 LT');
  });
});

describe('FluxoFilaEmbaladoCopy', () => {
  it('uma data', () => {
    expect(FluxoFilaEmbaladoCopy.linhaApoio('224 CX', ['2026-08-17'])).toBe(
      '224 CX de OP de 17/08',
    );
  });
  it('várias datas', () => {
    expect(FluxoFilaEmbaladoCopy.linhaApoio('10 CX', ['2026-08-17', '2026-08-16'])).toBe(
      '10 CX de OP anterior',
    );
  });
  it('só sem OP', () => {
    expect(FluxoFilaEmbaladoCopy.linhaApoio('10 CX', [])).toBe('10 CX sem OP');
  });
  it('heading e badge', () => {
    expect(FluxoFilaEmbaladoCopy.headingZona('2026-08-17')).toBe('Produzido hoje · OP de 17/08');
    expect(FluxoFilaEmbaladoCopy.headingZona(null)).toBe('Produzido hoje · Sem OP');
    expect(FluxoFilaEmbaladoCopy.badge('2026-08-17')).toBe('OP 17/08');
    expect(FluxoFilaEmbaladoCopy.badge(null)).toBe('Sem OP');
  });
  it('aria do tile', () => {
    expect(FluxoFilaEmbaladoCopy.ariaTile('Embalado', '427 CX', null)).toBe('Embalado, 427 CX');
    expect(
      FluxoFilaEmbaladoCopy.ariaTile('Embalado', '427 CX', '224 CX de OP de 17/08'),
    ).toBe('Embalado, 427 CX, 224 CX de OP de 17/08');
  });
  it('datasOpAnteriores unique desc', () => {
    const items = [
      item({
        volumeUn: 1,
        assadeiraNome: 'A20',
        preso: false,
        origem: 'op_anterior',
        dataOp: '2026-08-16',
      }),
      item({
        volumeUn: 1,
        assadeiraNome: 'A20',
        preso: false,
        origem: 'op_anterior',
        dataOp: '2026-08-17',
      }),
      item({ volumeUn: 1, assadeiraNome: 'A20', preso: false, origem: 'sem_op', dataOp: null }),
    ];
    expect(FluxoFilaEmbaladoCopy.datasOpAnteriores(items)).toEqual([
      '2026-08-17',
      '2026-08-16',
    ]);
  });
});
