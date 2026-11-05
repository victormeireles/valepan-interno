import type { PlanoNaFolha } from './plano-saude-faixa';

/** Diária do vale transporte vira mês por esta média de dias trabalhados. */
export const FOLHA_DIAS_VALE_TRANSPORTE = 22;

const SEM_PLANO: PlanoNaFolha = { centavos: 0, semFaixa: false, motivo: null };

export type FolhaPacote = {
  salarioCentavos: number;
  valeTransporteCentavos: number;
  valeAlimentacaoCentavos: number;
  planoSaude: boolean;
};

export type FolhaBalde = {
  pessoas: number;
  comPacote: number;
  salarioCentavos: number;
  valeTransporteCentavos: number;
  valeAlimentacaoCentavos: number;
  totalCentavos: number;
  planoSaude: number;
  planoSaudeCentavos: number;
  planoSaudeSemFaixa: number;
};

export class FolhaBaldeSoma {
  vazio(): FolhaBalde {
    return {
      pessoas: 0,
      comPacote: 0,
      salarioCentavos: 0,
      valeTransporteCentavos: 0,
      valeAlimentacaoCentavos: 0,
      totalCentavos: 0,
      planoSaude: 0,
      planoSaudeCentavos: 0,
      planoSaudeSemFaixa: 0,
    };
  }

  comPessoa(balde: FolhaBalde, pacote: FolhaPacote | null, plano: PlanoNaFolha = SEM_PLANO): FolhaBalde {
    if (!pacote) return { ...balde, pessoas: balde.pessoas + 1 };
    const valeTransporteCentavos = pacote.valeTransporteCentavos * FOLHA_DIAS_VALE_TRANSPORTE;
    const planoCentavos = pacote.planoSaude ? plano.centavos : 0;
    const total = pacote.salarioCentavos + valeTransporteCentavos + pacote.valeAlimentacaoCentavos + planoCentavos;
    return {
      pessoas: balde.pessoas + 1,
      comPacote: balde.comPacote + 1,
      salarioCentavos: balde.salarioCentavos + pacote.salarioCentavos,
      valeTransporteCentavos: balde.valeTransporteCentavos + valeTransporteCentavos,
      valeAlimentacaoCentavos: balde.valeAlimentacaoCentavos + pacote.valeAlimentacaoCentavos,
      totalCentavos: balde.totalCentavos + total,
      planoSaude: balde.planoSaude + (pacote.planoSaude ? 1 : 0),
      planoSaudeCentavos: balde.planoSaudeCentavos + planoCentavos,
      planoSaudeSemFaixa: balde.planoSaudeSemFaixa + (pacote.planoSaude && plano.semFaixa ? 1 : 0),
    };
  }

  juntar(baldes: FolhaBalde[]): FolhaBalde {
    return baldes.reduce(
      (acumulado, item) => ({
        pessoas: acumulado.pessoas + item.pessoas,
        comPacote: acumulado.comPacote + item.comPacote,
        salarioCentavos: acumulado.salarioCentavos + item.salarioCentavos,
        valeTransporteCentavos: acumulado.valeTransporteCentavos + item.valeTransporteCentavos,
        valeAlimentacaoCentavos: acumulado.valeAlimentacaoCentavos + item.valeAlimentacaoCentavos,
        totalCentavos: acumulado.totalCentavos + item.totalCentavos,
        planoSaude: acumulado.planoSaude + item.planoSaude,
        planoSaudeCentavos: acumulado.planoSaudeCentavos + item.planoSaudeCentavos,
        planoSaudeSemFaixa: acumulado.planoSaudeSemFaixa + item.planoSaudeSemFaixa,
      }),
      this.vazio(),
    );
  }
}
