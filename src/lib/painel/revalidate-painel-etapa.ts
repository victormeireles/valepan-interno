import { revalidatePath } from 'next/cache';

export type PainelEtapaRevalidateId = 'fermentacao' | 'forno' | 'embalagem';

/**
 * Invalida JSON de etapa + carga + fluxo (quadros de TV) após lançamento.
 */
export class PainelEtapaRevalidator {
  static paths(etapa: PainelEtapaRevalidateId): string[] {
    const paths = [
      `/api/painel/${etapa}`,
      `/api/painel/${etapa}/carga`,
      '/api/painel/fluxo-processo/carga',
      `/painel/${etapa}`,
    ];
    if (etapa === 'embalagem') paths.push('/api/painel/estoque');
    return paths;
  }

  static run(etapa: PainelEtapaRevalidateId): void {
    for (const path of this.paths(etapa)) revalidatePath(path);
  }
}
