import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';

type EntradaMapa = { modulo: InternoModuloId; codigo: string };

export class ManutencaoSetoresPorModulo {
  static readonly MAPA: readonly EntradaMapa[] = [
    { modulo: 'interno_fermentacao', codigo: 'PRO' },
    { modulo: 'interno_forno', codigo: 'FOR' },
    { modulo: 'interno_embalagem', codigo: 'EMB' },
  ];

  constructor(private readonly manager = new InternoAccessManager()) {}

  codigosElegiveis(snap: UsuarioAuthzSnapshot): string[] {
    if (snap.isSystemOwner) {
      return ManutencaoSetoresPorModulo.MAPA.map((item) => item.codigo);
    }
    return ManutencaoSetoresPorModulo.MAPA.filter((item) =>
      this.manager.temModulo(snap, item.modulo, 'editar'),
    ).map((item) => item.codigo);
  }
}
