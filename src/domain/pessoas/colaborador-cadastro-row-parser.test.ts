import { describe, expect, it } from 'vitest';
import { ColaboradorCadastroRowParser } from './colaborador-cadastro-row-parser';

describe('ColaboradorCadastroRowParser', () => {
  it('lê os campos cadastrais da linha', () => {
    const cadastro = new ColaboradorCadastroRowParser().parse({
      telefone: '24998180620',
      email: 'ana@valepan.com',
      nome_mae: 'Maria da Silva',
      cpf: '39053344705',
      endereco: 'Rua A, 10',
      vale_transporte: false,
      contato_emergencia: 'João',
      telefone_emergencia: null,
      tamanho_camiseta: 'M',
      tamanho_calca: '42',
      numero_calcado: '40',
      banco: 'Itaú',
      agencia: '1234',
      conta_corrente: '56789-0',
      conta_poupanca: true,
      chave_pix: 'ana@valepan.com',
    });
    expect(cadastro.nomeMae).toBe('Maria da Silva');
    expect(cadastro.valeTransporte).toBe(false);
    expect(cadastro.contaCorrente).toBe('56789-0');
    expect(cadastro.contaPoupanca).toBe(true);
    expect(cadastro.telefoneEmergencia).toBeNull();
  });
});
