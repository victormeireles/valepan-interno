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

/**
 * Ordem: mais específico primeiro. APIs públicas e de módulo vêm antes do
 * fallback `{ kind: 'app' }` implícito no fim de `resolve`.
 */
const ROUTE_RULES: RouteRule[] = [
  // —— Público (máquina / auth / páginas de entrada) ——
  { match: 'prefix', prefix: '/api/auth', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/public', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/cron', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/webhooks', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/api/health', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/login', requirement: { kind: 'public' } },
  { match: 'prefix', prefix: '/sem-acesso', requirement: { kind: 'public' } },

  // —— APIs de produção (prefixos específicos antes de genéricos) ——
  {
    match: 'prefix',
    prefix: '/api/producao/fermentacao',
    requirement: modulo('interno_fermentacao', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/fermentacao',
    requirement: modulo('interno_fermentacao', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/producao/forno',
    requirement: modulo('interno_forno', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/forno',
    requirement: modulo('interno_forno', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/producao/embalagem',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/embalagem',
    requirement: modulo('interno_embalagem', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/embalagem',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/submit/embalagem-pedido',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/duplicate/embalagem-pedido',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/options/embalagem',
    requirement: modulo('interno_embalagem', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/options/forno',
    requirement: modulo('interno_forno', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/producao/saidas',
    requirement: modulo('interno_saidas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/saidas',
    requirement: modulo('interno_saidas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/submit/saidas',
    requirement: modulo('interno_saidas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/options/saidas',
    requirement: modulo('interno_saidas', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/saidas',
    requirement: modulo('interno_saidas', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/producao',
    requirement: modulo('interno_painel', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/ordens-producao',
    requirement: modulo('interno_ordens', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/etiqueta',
    requirement: modulo('interno_etiquetas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/etiquetas',
    requirement: modulo('interno_etiquetas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/insumos',
    requirement: modulo('interno_insumos', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/estoque',
    requirement: modulo('interno_estoque', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/painel/estoque',
    requirement: modulo('interno_estoque', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/config',
    requirement: modulo('interno_config', 'administrar'),
  },
  {
    match: 'prefix',
    prefix: '/api/produtos',
    requirement: modulo('interno_config', 'administrar'),
  },
  // Flags de etiqueta por cliente (legado EtiquetaModal) — módulo etiquetas.
  {
    match: 'prefix',
    prefix: '/api/clientes',
    requirement: modulo('interno_etiquetas', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/api/upload/producao-photo',
    requirement: modulo('interno_embalagem', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/upload/photo',
    requirement: modulo('interno_saidas', 'editar'),
  },
  {
    match: 'prefix',
    prefix: '/api/photo',
    requirement: modulo('interno_saidas', 'editar'),
  },

  // —— Páginas UI ——
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
