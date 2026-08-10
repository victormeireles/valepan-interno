import {
  InternoModuloId,
  NivelModulo,
  NIVEL_ORDEM,
  isModuloInterno,
} from './interno-modulos-catalog';

export type PerfilModuloRow = {
  modulo: string;
  nivel: NivelModulo;
};

export class PerfilModulosResolver {
  resolve(rows: PerfilModuloRow[]): Partial<Record<InternoModuloId, NivelModulo>> {
    const result: Partial<Record<InternoModuloId, NivelModulo>> = {};

    for (const row of rows) {
      if (!isModuloInterno(row.modulo)) continue;

      const modulo = row.modulo;
      const atual = result[modulo];
      if (!atual || NIVEL_ORDEM[row.nivel] > NIVEL_ORDEM[atual]) {
        result[modulo] = row.nivel;
      }
    }

    return result;
  }
}
