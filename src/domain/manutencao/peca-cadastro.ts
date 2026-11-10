import { MaquinaCodigo } from './maquina-codigo';

export type PecaEntrada = {
  codigo: string;
  nome: string;
  unidade: string;
  ativo: boolean;
};

export type PecaLinhaValidada = {
  codigo: string;
  nome: string;
  unidade: string;
  ativo: boolean;
};

type PecaUsada = { id: string; codigo: string };

type ResultadoPecaCadastro =
  | { ok: true; linha: PecaLinhaValidada }
  | { ok: false; mensagem: string };

const UNIDADE_PADRAO = 'UN';

export class PecaCadastro {
  constructor(private readonly codigoPeca = new MaquinaCodigo()) {}

  validar(
    entrada: PecaEntrada,
    usadas: PecaUsada[],
    proprioId?: string,
  ): ResultadoPecaCadastro {
    const codigo = this.codigoPeca.normalizar(entrada.codigo);
    if (!codigo) return { ok: false, mensagem: 'Informe o código.' };

    const nome = entrada.nome.trim();
    if (!nome) return { ok: false, mensagem: 'Informe o nome.' };

    if (this.codigoEmUso(codigo, usadas, proprioId)) {
      return { ok: false, mensagem: 'Já existe uma peça com esse código.' };
    }

    return { ok: true, linha: this.montarLinha(entrada, codigo, nome) };
  }

  private codigoEmUso(
    codigo: string,
    usadas: PecaUsada[],
    proprioId?: string,
  ): boolean {
    const chave = this.codigoPeca.chave(codigo);
    return usadas.some(
      (usada) =>
        usada.id !== proprioId && this.codigoPeca.chave(usada.codigo) === chave,
    );
  }

  private montarLinha(
    entrada: PecaEntrada,
    codigo: string,
    nome: string,
  ): PecaLinhaValidada {
    return {
      codigo,
      nome,
      unidade: this.unidade(entrada.unidade),
      ativo: entrada.ativo,
    };
  }

  private unidade(valor: string): string {
    const aparada = valor.trim();
    if (!aparada || aparada.toLocaleLowerCase('pt-BR') === 'un') {
      return UNIDADE_PADRAO;
    }
    return aparada;
  }
}
