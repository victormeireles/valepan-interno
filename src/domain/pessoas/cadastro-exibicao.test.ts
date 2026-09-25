import { describe, expect, it } from 'vitest';
import { CadastroExibicao } from './cadastro-exibicao';

describe('CadastroExibicao', () => {
  const exibir = new CadastroExibicao();

  it('formata CPF, telefone e vale', () => {
    expect(exibir.cpf('39053344705')).toBe('390.533.447-05');
    expect(exibir.telefone('24998180620')).toBe('(24) 99818-0620');
    expect(exibir.telefone('2433221100')).toBe('(24) 3322-1100');
    expect(exibir.poupanca(true)).toBe('Poupança');
    expect(exibir.poupanca(false)).toBe('Conta corrente');
    expect(exibir.vale(true)).toBe('Precisa');
    expect(exibir.vale(false)).toBe('Não precisa');
    expect(exibir.texto(null)).toBe('—');
  });
});
