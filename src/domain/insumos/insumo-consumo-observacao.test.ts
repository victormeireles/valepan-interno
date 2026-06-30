import { describe, expect, it } from 'vitest';
import { formatarObservacaoConsumoFermentacao } from './insumo-consumo-observacao';

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
