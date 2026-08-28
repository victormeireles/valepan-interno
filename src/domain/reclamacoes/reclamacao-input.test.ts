import { describe, expect, it } from 'vitest';
import { validarReclamacaoSave, type ReclamacaoSaveInput } from './reclamacao-input';

const base: ReclamacaoSaveInput = {
  clienteId: 'c1',
  produtoId: 'p1',
  categoriaId: 'k1',
  exigeObservacao: false,
  observacao: null,
  dataFabricacao: '2026-08-12',
  dataProblema: '2026-08-25',
  quantidade: 10,
  unidade: 'caixas',
  fotosCount: 0,
};

describe('validarReclamacaoSave', () => {
  it('aceita payload mínimo válido', () => {
    expect(validarReclamacaoSave(base)).toBeNull();
  });

  it('recusa campos obrigatórios vazios', () => {
    expect(validarReclamacaoSave({ ...base, clienteId: ' ' })).toBe('Informe o cliente.');
    expect(validarReclamacaoSave({ ...base, produtoId: '' })).toBe('Informe o produto.');
    expect(validarReclamacaoSave({ ...base, categoriaId: '' })).toBe('Informe a categoria.');
    expect(validarReclamacaoSave({ ...base, dataFabricacao: '' })).toBe('Informe a data de fabricação.');
    expect(validarReclamacaoSave({ ...base, dataProblema: '12/08' })).toBe('Informe a data do problema.');
  });

  it('recusa outros sem observação e mais de 10 fotos', () => {
    expect(
      validarReclamacaoSave({ ...base, exigeObservacao: true, observacao: '  ' }),
    ).toBe('Descreva o problema.');
    expect(validarReclamacaoSave({ ...base, fotosCount: 11 })).toBe('No máximo 10 fotos.');
  });

  it('não exige problema ≥ fabricação', () => {
    expect(
      validarReclamacaoSave({
        ...base,
        dataFabricacao: '2026-08-25',
        dataProblema: '2026-08-21',
      }),
    ).toBeNull();
  });
});
