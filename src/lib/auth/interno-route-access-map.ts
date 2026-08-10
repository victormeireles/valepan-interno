import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';

export type InternoRouteRequirement =
  | { kind: 'modulo'; modulo: InternoModuloId; minimo: NivelModulo }
  | { kind: 'app' }
  | { kind: 'public' };

type ModuloRequirement = Extract<
  InternoRouteRequirement,
  { kind: 'modulo' }
>;

type RouteRule =
  | { match: 'prefix'; prefix: string; requirement: InternoRouteRequirement }
  | { match: 'exact'; path: string; requirement: InternoRouteRequirement };

function modulo(
  moduloId: InternoModuloId,
  minimo: NivelModulo,
): ModuloRequirement {
  return { kind: 'modulo', modulo: moduloId, minimo };
}

const ROUTE_RULES: RouteRule[] = [
  { match: 'prefix', prefix: '/api/auth', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/public', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/cron', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/login', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/sem-acesso', requirement: { kind: 'public' } },
  {
    match: 'prefix',
    prefix: '/realizado/fermentacao',
    requirement: modulo('interno_fermentacao', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/realizado/forno',
    requirement: modulo('interno_forno', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/realizado/embalagem',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/realizado/saidas',
    requirement: modulo('interno_saidas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/realizado/painel-producao',
    requirement: modulo('interno_painel', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/ordens-producao',
    requirement: modulo('interno_ordens', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/etiquetas',
    requirement: modulo('interno_etiquetas', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/estoque-insumos',
    requirement: modulo('interno_insumos', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/mapeamento-insumos',
    requirement: modulo('interno_insumos', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/consumo-insumos',
    requirement: modulo('interno_insumos', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/painel/dashboard-estoque',
    requirement: modulo('interno_estoque', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/estoque/auditoria',
    requirement: modulo('interno_estoque', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/config',
    requirement: modulo('interno_config', 'administrar'),
  },
  { match: 'exact', path: '/', requirement: { kind: 'app' } },
];

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export class InternoRouteAccessMap {
  resolve(pathname: string): InternoRouteRequirement {
    const normalized = normalizePathname(pathname);

    for (const rule of ROUTE_RULES) {
      if (rule.match === 'exact' && normalized === rule.path) {
        return rule.requirement;
      }

      if (rule.match === 'prefix' && matchesPrefix(normalized, rule.prefix)) {
        return rule.requirement;
      }
    }

    return { kind: 'app' };
  }
}
