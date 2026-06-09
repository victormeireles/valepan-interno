import { describe, expect, it } from 'vitest';
import {
  loteTemQuantidadeProduzida,
  montarObservacaoSaidaExclusaoEmbalagem,
  OBS_SAIDA_EXCLUSAO_EMBALAGEM,
} from '@/domain/embalagem/embalagem-lote-exclusao';

describe('embalagem-lote-exclusao', () => {
  it('monta observação da saída com produto', () => {
    expect(montarObservacaoSaidaExclusaoEmbalagem('HB 60g')).toBe(
      `${OBS_SAIDA_EXCLUSAO_EMBALAGEM} — HB 60g`,
    );
  });

  it('detecta lote com quantidade produzida', () => {
    expect(
      loteTemQuantidadeProduzida({ caixas: 5, pacotes: 0, unidades: 0, kg: 0 }),
    ).toBe(true);
    expect(
      loteTemQuantidadeProduzida({ caixas: 0, pacotes: 0, unidades: 0, kg: 0 }),
    ).toBe(false);
  });
});
