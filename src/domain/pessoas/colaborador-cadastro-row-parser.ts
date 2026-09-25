import type { ColaboradorCadastro } from './colaborador-cadastro';

export class ColaboradorCadastroRowParser {
  parse(row: unknown): ColaboradorCadastro {
    if (!this.registro(row)) throw new Error('Cadastro do colaborador inválido.');
    return {
      telefone: this.texto(row.telefone),
      email: this.texto(row.email),
      nomeMae: this.texto(row.nome_mae),
      cpf: this.texto(row.cpf),
      endereco: this.texto(row.endereco),
      valeTransporte: this.booleano(row.vale_transporte),
      contatoEmergencia: this.texto(row.contato_emergencia),
      telefoneEmergencia: this.texto(row.telefone_emergencia),
      tamanhoCamiseta: this.texto(row.tamanho_camiseta),
      tamanhoCalca: this.texto(row.tamanho_calca),
      numeroCalcado: this.texto(row.numero_calcado),
      banco: this.texto(row.banco),
      agencia: this.texto(row.agencia),
      contaCorrente: this.texto(row.conta_corrente),
      contaPoupanca: row.conta_poupanca === true,
      chavePix: this.texto(row.chave_pix),
    };
  }

  private texto(valor: unknown): string | null {
    return typeof valor === 'string' && valor.trim() ? valor : null;
  }

  private booleano(valor: unknown): boolean | null {
    if (valor === true || valor === false) return valor;
    return null;
  }

  private registro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }
}
