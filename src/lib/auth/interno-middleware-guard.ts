import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from './interno-access-manager';
import { InternoRouteAccessMap } from './interno-route-access-map';

export type InternoMiddlewareToken = {
  sub?: string | null;
  isSystemOwner?: boolean;
  modulosEfetivos?: Partial<Record<InternoModuloId, NivelModulo>>;
} | null;

export type InternoMiddlewareDecision =
  | 'allow'
  | { redirect: string };

export type InternoMiddlewareDecideInput = {
  pathname: string;
  token: InternoMiddlewareToken;
};

export class InternoMiddlewareGuard {
  constructor(
    private readonly routeMap: InternoRouteAccessMap,
    private readonly accessManager: InternoAccessManager,
  ) {}

  decide(input: InternoMiddlewareDecideInput): InternoMiddlewareDecision {
    const requirement = this.routeMap.resolve(input.pathname);

    if (requirement.kind === 'public') {
      return 'allow';
    }

    if (!input.token) {
      return {
        redirect: `/login?callbackUrl=${encodeURIComponent(input.pathname)}`,
      };
    }

    const snap = this.toSnapshot(input.token);

    if (!this.accessManager.podeAcessarApp(snap)) {
      return { redirect: '/sem-acesso' };
    }

    if (requirement.kind === 'modulo') {
      if (
        !this.accessManager.temModulo(
          snap,
          requirement.modulo,
          requirement.minimo,
        )
      ) {
        return { redirect: '/?erro=sem-permissao' };
      }
    }

    if (requirement.kind === 'anyModulo') {
      const temAlgum = requirement.modulos.some((modulo) =>
        this.accessManager.temModulo(snap, modulo, requirement.minimo),
      );
      if (!temAlgum) {
        return { redirect: '/?erro=sem-permissao' };
      }
    }

    return 'allow';
  }

  private toSnapshot(token: NonNullable<InternoMiddlewareToken>): UsuarioAuthzSnapshot {
    return {
      isSystemOwner: token.isSystemOwner ?? false,
      identidades: [],
      modulosEfetivos: token.modulosEfetivos ?? {},
    };
  }
}
