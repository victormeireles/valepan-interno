/** Erro tipado quando CSV traz tipo/situação que a carga não deve inventar. */
export class CargaPessoasCampoInvalidoError extends Error {
  readonly codigo: string;
  readonly motivo: string;

  constructor(codigo: string, motivo: string) {
    super(`${codigo}: ${motivo}`);
    this.name = 'CargaPessoasCampoInvalidoError';
    this.codigo = codigo;
    this.motivo = motivo;
  }
}
