import { describe, expect, it } from 'vitest';
import { ColaboradorCadastroNormalizador } from './colaborador-cadastro';

const vazio: Record<string, string> = {
  telefone: '',
  email: '',
  nomeMae: '',
  cpf: '',
  endereco: '',
  valeTransporte: '',
  contatoEmergencia: '',
  telefoneEmergencia: '',
  tamanhoCamiseta: '',
  tamanhoCalca: '',
  numeroCalcado: '',
  banco: '',
  agencia: '',
  contaCorrente: '',
  contaPoupanca: '0',
  chavePix: '',
};

describe('ColaboradorCadastroNormalizador', () => {
  const normalizador = new ColaboradorCadastroNormalizador();

  it('aceita cadastro vazio', () => {
    const cadastro = normalizador.normalizar(vazio);
    expect(cadastro.cpf).toBeNull();
    expect(cadastro.valeTransporte).toBeNull();
    expect(cadastro.contaPoupanca).toBe(false);
    expect(cadastro.dataAdmissao).toBeNull();
    expect(normalizador.cpfConferido(cadastro.cpf)).toBe(false);
  });

  it('normaliza contato, documentos e EPI', () => {
    const cadastro = normalizador.normalizar({
      ...vazio,
      telefone: '(24) 99818-0620',
      email: 'Ana@Valepan.com',
      nomeMae: 'maria da silva',
      cpf: '390.533.447-05',
      endereco: 'Rua A, 10',
      valeTransporte: 'sim',
      contatoEmergencia: 'joao de souza',
      telefoneEmergencia: '2433221100',
      tamanhoCamiseta: 'g',
      tamanhoCalca: '42',
      numeroCalcado: '40',
      banco: 'Banco do Brasil',
      agencia: '1234',
      contaCorrente: '56789-0',
      contaPoupanca: '1',
      chavePix: 'ana@valepan.com',
    });
    expect(cadastro.telefone).toBe('24998180620');
    expect(cadastro.email).toBe('ana@valepan.com');
    expect(cadastro.nomeMae).toBe('Maria da Silva');
    expect(cadastro.cpf).toBe('39053344705');
    expect(cadastro.valeTransporte).toBe(true);
    expect(cadastro.banco).toBe('Banco do Brasil');
    expect(cadastro.agencia).toBe('1234');
    expect(cadastro.contaCorrente).toBe('56789-0');
    expect(cadastro.contaPoupanca).toBe(true);
    expect(cadastro.tamanhoCamiseta).toBe('G');
    expect(normalizador.cpfConferido(cadastro.cpf)).toBe(true);
  });

  it('capitaliza o nome do colaborador e rejeita nome curto', () => {
    expect(normalizador.nomeColaborador('maria da silva')).toBe('Maria da Silva');
    expect(() => normalizador.normalizar({ ...vazio, nome: 'An' })).toThrow('Informe o nome.');
    expect(normalizador.normalizar(vazio).telefone).toBeNull();
  });

  it('rejeita CPF, e-mail, telefone e camiseta inválidos', () => {
    expect(() => normalizador.normalizar({ ...vazio, cpf: '111' })).toThrow('CPF inválido.');
    expect(() => normalizador.normalizar({ ...vazio, email: 'ana' })).toThrow('E-mail inválido.');
    expect(() => normalizador.normalizar({ ...vazio, telefone: '123' })).toThrow('Telefone incompleto.');
    expect(() => normalizador.normalizar({ ...vazio, tamanhoCamiseta: 'XXX' })).toThrow('Tamanho de camiseta inválido.');
    expect(normalizador.normalizar({ ...vazio, valeTransporte: 'nao' }).valeTransporte).toBe(false);
  });

  it('grava a data de admissão em ISO e aceita o campo vazio', () => {
    expect(normalizador.normalizar({ ...vazio, dataAdmissao: '2026-11-04' }).dataAdmissao).toBe('2026-11-04');
    expect(normalizador.dataAdmissao('')).toBeNull();
    expect(() => normalizador.dataAdmissao('04/11/2026')).toThrow('Informe a data de admissão.');
  });
});
