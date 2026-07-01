import { describe, expect, it } from 'vitest';
import {
  formatarObservacaoConsumoEmbalagem,
  formatarObservacaoConsumoFermentacao,
  formatarObservacaoConsumoForno,
} from './insumo-consumo-observacao';

describe('formatarObservacaoConsumoFermentacao', () => {
  it('formata LT e UN no modo assadeiras', () => {
    expect(
      formatarObservacaoConsumoFermentacao({
        produtoNome: 'HB 65g',
        modo: 'assadeiras',
        lote: { assadeiras: 2, unidades: 0 },
        unidadesPorAssadeira: 30,
        loteId: 'abc12345-0000-0000-0000-000000000000',
      }),
    ).toBe('Produção fermentação • HB 65g • 2 LT (60 UN) • lote abc12345');
  });
});

describe('formatarObservacaoConsumoForno', () => {
  it('formata UN no modo unidades', () => {
    expect(
      formatarObservacaoConsumoForno({
        produtoNome: 'HB 65g',
        modo: 'unidades',
        lote: { assadeiras: 0, unidades: 120 },
        unidadesPorAssadeira: null,
        loteId: 'def67890-0000-0000-0000-000000000000',
      }),
    ).toBe('Produção forno • HB 65g • 120 UN • lote def67890');
  });
});

describe('formatarObservacaoConsumoEmbalagem', () => {
  it('formata PCT e UN', () => {
    expect(
      formatarObservacaoConsumoEmbalagem({
        produtoNome: 'HB 65g',
        unidades: 120,
        pacotes: 20,
        loteId: 'aaaa1111-0000-0000-0000-000000000000',
      }),
    ).toBe('Produção embalagem • HB 65g • 20 PCT / 120 UN • lote aaaa1111');
  });
});
