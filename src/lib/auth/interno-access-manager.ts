import {
  InternoModuloId,
  NivelModulo,
  isModuloInterno,
  nivelAtende,
} from './interno-modulos-catalog';

export class InternoAccessError extends Error {
  readonly code = 'INTERNO_FORBIDDEN' as const;

  constructor(message: string) {
    super(message);
    this.name = 'InternoAccessError';
  }
}

export type UsuarioAuthzSnapshot = {
  isSystemOwner: boolean;
  identidades: string[];
  modulosEfetivos: Partial<Record<InternoModuloId, NivelModulo>>;
};

export class InternoAccessManager {
  podeAcessarApp(snap: UsuarioAuthzSnapshot): boolean {
    if (snap.isSystemOwner) return true;
    return Object.keys(snap.modulosEfetivos).some((k) => isModuloInterno(k));
  }

  temModulo(
    snap: UsuarioAuthzSnapshot,
    modulo: InternoModuloId,
    minimo: NivelModulo,
  ): boolean {
    if (snap.isSystemOwner) return true;
    return nivelAtende(snap.modulosEfetivos[modulo], minimo);
  }

  requireModulo(
    snap: UsuarioAuthzSnapshot,
    modulo: InternoModuloId,
    minimo: NivelModulo,
  ): void {
    if (!this.temModulo(snap, modulo, minimo)) {
      throw new InternoAccessError(`Sem permissão: ${modulo} (${minimo})`);
    }
  }
}
