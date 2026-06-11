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
});
