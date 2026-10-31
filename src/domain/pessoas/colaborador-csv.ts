import { CsvFormulaSeguro } from './csv-formula-seguro';
import type { Regime } from './regime-cadastro';

export type ColaboradorCsvLinha = {
  codigo: string;
  nome: string;
  cpf: string | null;
  situacao: string;
  regime: Regime;
  cnpj: string | null;
  razaoSocial: string | null;
};

const CABECALHO = 'codigo;nome;cpf;situacao;regime;cnpj;razao_social';

export class ColaboradorCsv {
  constructor(private readonly celulas = new CsvFormulaSeguro()) {}

  gerar(linhas: ColaboradorCsvLinha[]): string {
    const corpo = linhas.map((linha) =>
      this.celulas.linha([
        linha.codigo,
        linha.nome,
        linha.cpf ?? '',
        linha.situacao,
        linha.regime,
        linha.cnpj ?? '',
        linha.razaoSocial ?? '',
      ]),
    );
    return [CABECALHO, ...corpo].join('\n');
  }
}
