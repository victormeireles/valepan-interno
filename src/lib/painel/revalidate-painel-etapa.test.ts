import { describe, expect, it } from 'vitest';
import { PainelEtapaRevalidator } from './revalidate-painel-etapa';

describe('PainelEtapaRevalidator', () => {
  it('invalida JSON, carga, fluxo e quadro da etapa', () => {
    expect(PainelEtapaRevalidator.paths('fermentacao')).toEqual([
      '/api/painel/fermentacao',
      '/api/painel/fermentacao/carga',
      '/api/painel/fluxo-processo/carga',
      '/painel/fermentacao',
    ]);
  });

  it('em embalagem também invalida estoque', () => {
    expect(PainelEtapaRevalidator.paths('embalagem')).toContain('/api/painel/estoque');
  });
});
