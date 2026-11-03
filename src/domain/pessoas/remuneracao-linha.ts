import type { RemuneracaoPacote } from './remuneracao-pacote';
import type { RemuneracaoVigencia } from './remuneracao-quadro';

export type RemuneracaoUpsert = {
  colaborador_id: string;
  inicio: string;
  salario_centavos: number;
  vale_transporte_centavos: number;
  vale_alimentacao_centavos: number;
  plano_saude: boolean;
  updated_at: string;
};

export type LinhaRemuneracaoBanco = {
  id: string;
  inicio: string;
  salario_centavos: number;
  vale_transporte_centavos: number;
  vale_alimentacao_centavos: number;
  plano_saude: boolean;
};

export class RemuneracaoLinhaGravacao {
  montar(colaboradorId: string, pacote: RemuneracaoPacote, atualizadoEm: string): RemuneracaoUpsert {
    return {
      colaborador_id: colaboradorId,
      inicio: pacote.inicio,
      salario_centavos: pacote.salarioCentavos,
      vale_transporte_centavos: pacote.valeTransporteCentavos,
      vale_alimentacao_centavos: pacote.valeAlimentacaoCentavos,
      plano_saude: pacote.planoSaude,
      updated_at: atualizadoEm,
    };
  }
}

export class RemuneracaoVigenciaParser {
  parse(row: LinhaRemuneracaoBanco): RemuneracaoVigencia {
    return {
      id: row.id,
      inicio: String(row.inicio).slice(0, 10),
      salarioCentavos: row.salario_centavos,
      valeTransporteCentavos: row.vale_transporte_centavos,
      valeAlimentacaoCentavos: row.vale_alimentacao_centavos,
      planoSaude: row.plano_saude,
    };
  }

  parseAll(rows: LinhaRemuneracaoBanco[]): RemuneracaoVigencia[] {
    return rows.map((row) => this.parse(row));
  }
}
