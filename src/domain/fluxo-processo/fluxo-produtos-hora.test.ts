import { describe, expect, it } from 'vitest';

import {
  FluxoProdutosAssadeiraAggregator,
  FluxoProdutosHoraFilter,
} from '@/domain/fluxo-processo/fluxo-produtos-hora';

function iso(h: number): string {
  return `2026-08-13T${String(h).padStart(2, '0')}:15:00-03:00`;
}

describe('FluxoProdutosAssadeiraAggregator', () => {
  it('monta totais e matrizes por hora', () => {
    const agg = new FluxoProdutosAssadeiraAggregator();
    const produtos = agg.collect(
      '65g verde',
      [
        {
          produzidoEm: iso(2),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 7200,
          opAnterior: false,
        },
        {
          produzidoEm: iso(2),
          produtoNome: 'Outro',
          assadeiraNome: '65g verde',
          unidades: 2400,
          opAnterior: false,
        },
      ],
      [],
      [],
    );

    expect(produtos).toHaveLength(2);
    expect(produtos[0].ferm).toBe(7200);
    expect(produtos[0].fermHoras[2]).toBe(7200);
    expect(produtos[0].fermHoras[1]).toBe(0);
  });
});

describe('FluxoProdutosHoraFilter', () => {
  it('restringe à célula etapa × hora', () => {
    const produtos = new FluxoProdutosAssadeiraAggregator().collect(
      '65g verde',
      [
        {
          produzidoEm: iso(2),
          produtoNome: 'A',
          assadeiraNome: '65g verde',
          unidades: 100,
          opAnterior: false,
        },
        {
          produzidoEm: iso(5),
          produtoNome: 'B',
          assadeiraNome: '65g verde',
          unidades: 200,
          opAnterior: false,
        },
      ],
      [
        {
          produzidoEm: iso(2),
          produtoNome: 'A',
          assadeiraNome: '65g verde',
          unidades: 50,
          opAnterior: false,
        },
      ],
      [],
    );

    const filtrados = new FluxoProdutosHoraFilter().apply(produtos, {
      etapa: 'ferm',
      hora: 2,
    });

    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].nome).toBe('A');
    expect(filtrados[0].ferm).toBe(100);
    expect(filtrados[0].forno).toBe(0);
  });
});
