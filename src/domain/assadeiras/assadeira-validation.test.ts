import { describe, expect, it } from 'vitest';
import { parseAssadeiraForm } from './assadeira-validation';

describe('assadeiraFormSchema', () => {
  const valid = {
    nome: 'Assadeira 24',
    descricao: null,
    unidades_por_assadeira: 24,
    quantidade: 10,
    ordem: 0,
    ativo: true,
    diametro_buracos_mm: null,
  };

  it('aceita payload válido', () => {
    expect(parseAssadeiraForm(valid).success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    const result = parseAssadeiraForm({ ...valid, nome: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejeita pães por assadeira < 1', () => {
    const result = parseAssadeiraForm({ ...valid, unidades_por_assadeira: 0 });
    expect(result.success).toBe(false);
  });

  it('rejeita quantidade negativa', () => {
    const result = parseAssadeiraForm({ ...valid, quantidade: -1 });
    expect(result.success).toBe(false);
  });

  it('aceita descricao vazia como null', () => {
    const result = parseAssadeiraForm({
      ...valid,
      descricao: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descricao).toBeNull();
    }
  });
});
