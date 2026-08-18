import type { EstimativaProdutividadeMensal } from './estimativa-producao-types';

export class EstimativaProdutividadeResolver {
  resolve(
    anoMes: string,
    rows: EstimativaProdutividadeMensal[],
  ): EstimativaProdutividadeMensal | null {
    const valid = rows.filter((row) => this.hasValidRates(row));
    const exact = valid.find((row) => row.anoMes === anoMes);
    if (exact) return exact;

    const previous = valid
      .filter((row) => row.anoMes <= anoMes)
      .sort((left, right) => right.anoMes.localeCompare(left.anoMes));

    return previous[0] ?? null;
  }

  private hasValidRates(row: EstimativaProdutividadeMensal): boolean {
    return (
      row.taxaAssadeirasHoraProducao > 0 &&
      row.taxaAssadeirasHoraForno > 0 &&
      row.taxaCaixasHoraEmbalagem > 0
    );
  }
}

export const estimativaProdutividadeResolver = new EstimativaProdutividadeResolver();
