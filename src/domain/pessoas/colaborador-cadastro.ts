import { CpfVerificador } from './cpf-verificador';
import { NomeCapitalizador } from './nome-capitalizador';

export const TAMANHOS_CAMISETA = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;

export const CADASTRO_VAZIO: ColaboradorCadastro = {
  telefone: null,
  email: null,
  nomeMae: null,
  cpf: null,
  endereco: null,
  valeTransporte: null,
  contatoEmergencia: null,
  telefoneEmergencia: null,
  tamanhoCamiseta: null,
  tamanhoCalca: null,
  numeroCalcado: null,
  banco: null,
  agencia: null,
  contaCorrente: null,
  contaPoupanca: false,
  chavePix: null,
};

export type ColaboradorCadastro = {
  telefone: string | null;
  email: string | null;
  nomeMae: string | null;
  cpf: string | null;
  endereco: string | null;
  valeTransporte: boolean | null;
  contatoEmergencia: string | null;
  telefoneEmergencia: string | null;
  tamanhoCamiseta: string | null;
  tamanhoCalca: string | null;
  numeroCalcado: string | null;
  banco: string | null;
  agencia: string | null;
  contaCorrente: string | null;
  contaPoupanca: boolean;
  chavePix: string | null;
};

export class ColaboradorCadastroNormalizador {
  private readonly nomes = new NomeCapitalizador();
  private readonly cpfs = new CpfVerificador();

  normalizar(entrada: Record<string, string>): ColaboradorCadastro {
    return {
      telefone: this.telefone(entrada.telefone, 'Telefone'),
      email: this.email(entrada.email),
      nomeMae: this.nome(entrada.nomeMae),
      cpf: this.cpf(entrada.cpf),
      endereco: this.limite(entrada.endereco, 300, 'Endereço'),
      valeTransporte: this.vale(entrada.valeTransporte),
      contatoEmergencia: this.nome(entrada.contatoEmergencia),
      telefoneEmergencia: this.telefone(entrada.telefoneEmergencia, 'Telefone do contato'),
      tamanhoCamiseta: this.camiseta(entrada.tamanhoCamiseta),
      tamanhoCalca: this.limite(entrada.tamanhoCalca, 12, 'Tamanho da calça'),
      numeroCalcado: this.limite(entrada.numeroCalcado, 12, 'Número do calçado'),
      banco: this.limite(entrada.banco, 80, 'Banco'),
      agencia: this.limite(entrada.agencia, 12, 'Agência'),
      contaCorrente: this.limite(entrada.contaCorrente, 20, 'Conta'),
      contaPoupanca: entrada.contaPoupanca === '1',
      chavePix: this.limite(entrada.chavePix, 140, 'Chave Pix'),
    };
  }

  cpfConferido(cpf: string | null): boolean {
    return cpf !== null && this.cpfs.verificar(cpf);
  }

  private nome(valor: string | undefined): string | null {
    const texto = this.limite(valor, 120, 'Nome');
    return texto === null ? null : this.nomes.formatar(texto);
  }

  private cpf(valor: string | undefined): string | null {
    const digitos = (valor ?? '').replace(/\D/g, '');
    if (!digitos) return null;
    if (digitos.length !== 11 || !this.cpfs.verificar(digitos)) throw new Error('CPF inválido.');
    return digitos;
  }

  private email(valor: string | undefined): string | null {
    const texto = this.limite(valor, 120, 'E-mail')?.toLocaleLowerCase('pt-BR') ?? null;
    if (texto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) throw new Error('E-mail inválido.');
    return texto;
  }

  private telefone(valor: string | undefined, rotulo: string): string | null {
    const digitos = (valor ?? '').replace(/\D/g, '');
    if (!digitos) return null;
    if (digitos.length < 10 || digitos.length > 11) throw new Error(`${rotulo} incompleto.`);
    return digitos;
  }

  private camiseta(valor: string | undefined): string | null {
    const texto = (valor ?? '').trim().toLocaleUpperCase('pt-BR');
    if (!texto) return null;
    if (!TAMANHOS_CAMISETA.includes(texto as (typeof TAMANHOS_CAMISETA)[number])) {
      throw new Error('Tamanho de camiseta inválido.');
    }
    return texto;
  }

  private vale(valor: string | undefined): boolean | null {
    const texto = (valor ?? '').trim();
    if (!texto) return null;
    if (texto === 'sim') return true;
    if (texto === 'nao') return false;
    throw new Error('Informe se precisa de vale transporte.');
  }

  private limite(valor: string | undefined, maximo: number, rotulo: string): string | null {
    const texto = (valor ?? '').trim();
    if (!texto) return null;
    if (texto.length > maximo) throw new Error(`${rotulo} longo demais.`);
    return texto;
  }
}
