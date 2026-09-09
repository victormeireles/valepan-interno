import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from './interno-access-manager';
import { InternoAuthLifecycleGuard } from './interno-auth-lifecycle-guard';
import type { InternoAuthLifecycleStatus } from './interno-auth-lifecycle-types';
import { InternoRouteAccessMap } from './interno-route-access-map';

export type InternoMiddlewareToken = {
  sub?: string | null;
  isSystemOwner?: boolean;
  modulosEfetivos?: Partial<Record<InternoModuloId, NivelModulo>>;
} | null;

export type InternoMiddlewareDecision =
  | 'allow'
  | { redirect: string; clearSession?: boolean }
  | {
      json: { error: 'EmailRequired'; redirectTo: string };
      status: 409;
    };

export function internoMiddlewareRedirectPath(
  decision: Exclude<InternoMiddlewareDecision, 'allow'>,
): string {
  if ('json' in decision) {
    return decision.json.redirectTo;
  }
  return decision.redirect;
}

export type InternoMiddlewareDecideInput = {
  pathname: string;
  search?: string;
  token: InternoMiddlewareToken;
  /** HTTP method; defaults to GET when omitted (tests / callers legados). */
  method?: string;
  /** Status no banco; obrigatório em request autenticado no middleware. */
  usuarioStatus?: InternoAuthLifecycleStatus;
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
  private readonly lifecycleGuard = new InternoAuthLifecycleGuard();

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

    if (input.usuarioStatus) {
      const lifecycle = this.lifecycleGuard.decide({
        pathname: input.pathname,
        search: input.search,
        method,
        status: input.usuarioStatus,
      });
      if (lifecycle !== 'allow') {
        return lifecycle;
      }
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
