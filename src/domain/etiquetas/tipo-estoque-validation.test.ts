import { describe, expect, it } from 'vitest';
import { parseTipoEstoqueForm } from './tipo-estoque-validation';

describe('tipoEstoqueFormSchema', () => {
  const valid = {
    nome: 'Cliente X',
    ativo: true,
    possui_etiqueta: true,
    congelado: false,
    mostrar_texto_congelado: false,
  };

  it('aceita payload válido', () => {
    expect(parseTipoEstoqueForm(valid).success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    const result = parseTipoEstoqueForm({ ...valid, nome: '   ' });
    expect(result.success).toBe(false);
  });

  it('aplica defaults para flags booleanas', () => {
    const result = parseTipoEstoqueForm({ nome: 'Estoque interno' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ativo).toBe(true);
      expect(result.data.possui_etiqueta).toBe(false);
      expect(result.data.congelado).toBe(false);
      expect(result.data.mostrar_texto_congelado).toBe(false);
    }
  });

  it('aceita tipo congelado com texto congelado', () => {
    const result = parseTipoEstoqueForm({
      ...valid,
      congelado: true,
      mostrar_texto_congelado: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.congelado).toBe(true);
      expect(result.data.mostrar_texto_congelado).toBe(true);
    }
  });

  it('normaliza receita_caixa_id vazio para null', () => {
    const result = parseTipoEstoqueForm({ ...valid, receita_caixa_id: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.receita_caixa_id).toBeNull();
  });

  it('aceita receita_caixa_id uuid', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const result = parseTipoEstoqueForm({ ...valid, receita_caixa_id: id });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.receita_caixa_id).toBe(id);
  });

  it('default de receita_caixa_id é null', () => {
    const result = parseTipoEstoqueForm({ nome: 'Valepan' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.receita_caixa_id).toBeNull();
  });
});
