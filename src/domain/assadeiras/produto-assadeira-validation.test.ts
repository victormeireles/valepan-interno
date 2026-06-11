import { describe, expect, it } from 'vitest';
import {
  parseProdutoAssadeiraLinkForm,
  produtoAssadeiraLinkFormSchema,
} from './produto-assadeira-validation';

describe('produtoAssadeiraLinkFormSchema', () => {
  const valid = {
    produto_id: '11111111-1111-4111-8111-111111111111',
    assadeira_id: '22222222-2222-4222-8222-222222222222',
    usar_padrao: true,
    unidades_por_assadeira: null,
  };

  it('aceita vínculo usando padrão da assadeira', () => {
    expect(parseProdutoAssadeiraLinkForm(valid).success).toBe(true);
  });

  it('aceita override explícito >= 1', () => {
    const result = parseProdutoAssadeiraLinkForm({
      ...valid,
      usar_padrao: false,
      unidades_por_assadeira: 18,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita override < 1 quando não usa padrão', () => {
    const result = parseProdutoAssadeiraLinkForm({
      ...valid,
      usar_padrao: false,
      unidades_por_assadeira: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita produto_id vazio', () => {
    const result = parseProdutoAssadeiraLinkForm({
      ...valid,
      produto_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita assadeira_id vazio', () => {
    const result = parseProdutoAssadeiraLinkForm({
      ...valid,
      assadeira_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('normaliza usar_padrao=true para unidades null', () => {
    const result = produtoAssadeiraLinkFormSchema.parse({
      ...valid,
      usar_padrao: true,
      unidades_por_assadeira: 24,
    });
    expect(result.unidades_por_assadeira).toBeNull();
  });
});
