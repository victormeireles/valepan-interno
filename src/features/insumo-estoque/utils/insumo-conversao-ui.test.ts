import { describe, expect, it } from 'vitest';
import {
  buildFatorConversaoHint,
  buildFatorConversaoLabel,
  buildSugestoesFatorConversao,
  formatUnidadeLabel,
} from './insumo-conversao-ui';

describe('insumo-conversao-ui', () => {
  it('formata unidade priorizando código', () => {
    expect(formatUnidadeLabel('kg', 'Quilograma')).toBe('KG');
  });

  it('usa wording de conteúdo por unidade quando NF e estoque têm a mesma unidade', () => {
    expect(buildFatorConversaoLabel('KG', 'KG')).toBe(
      'Quantos KG há em cada unidade da nota fiscal?',
    );
    expect(buildFatorConversaoHint('KG', 'KG')).toContain('caixa de 25 KG');
  });

  it('sugere fator pelo peso na descrição', () => {
    const sugestoes = buildSugestoesFatorConversao({
      descricaoOmie: 'SPRING 2020 cx 25kg',
      unidadeNf: 'KG',
      unidadeInsumo: 'KG',
    });

    expect(sugestoes).toHaveLength(2);
    expect(sugestoes[0]?.label).toBe('Peso já na NF (1)');
    expect(sugestoes[1]?.value).toBe(25);
    expect(sugestoes[1]?.label).toBe('25 KG/un.');
  });
});
