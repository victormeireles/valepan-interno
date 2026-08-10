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
  /** HTTP method; defaults to GET when omitted (tests / callers legados). */
  method?: string;
};

/**
 * Para rotas mapeadas como `editar`, GET/HEAD exigem só `ler` (leitura de
 * dados nas páginas de planejamento). Mutações e `administrar`/`ler` fixos
 * mantêm o mínimo do mapa.
 */
export class InternoMiddlewareMinimoResolver {
  resolve(minimo: NivelModulo, method: string): NivelModulo {
    if (minimo !== 'editar') {
      return minimo;
    }

    const normalized = method.toUpperCase();
    if (normalized === 'GET' || normalized === 'HEAD') {
      return 'ler';
    }

    return 'editar';
  }
}

export class InternoMiddlewareGuard {
  private readonly minimoResolver = new InternoMiddlewareMinimoResolver();

  constructor(
    private readonly routeMap: InternoRouteAccessMap,
    private readonly accessManager: InternoAccessManager,
  ) {}

  decide(input: InternoMiddlewareDecideInput): InternoMiddlewareDecision {
    const requirement = this.routeMap.resolve(input.pathname);
    const method = input.method ?? 'GET';

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
      return { redirect: '/login?error=SemPermissao' };
    }

    if (requirement.kind === 'modulo') {
      const minimo = this.minimoResolver.resolve(requirement.minimo, method);
      if (!this.accessManager.temModulo(snap, requirement.modulo, minimo)) {
        return { redirect: '/?erro=sem-permissao' };
      }
    }

    if (requirement.kind === 'anyModulo') {
      const minimo = this.minimoResolver.resolve(requirement.minimo, method);
      const temAlgum = requirement.modulos.some((modulo) =>
        this.accessManager.temModulo(snap, modulo, minimo),
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
