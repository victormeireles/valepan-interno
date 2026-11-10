import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';

type ModuloRequirement = {
  kind: 'modulo';
  modulo: InternoModuloId;
  minimo: NivelModulo;
};

type AnyModuloRequirement = {
  kind: 'anyModulo';
  modulos: InternoModuloId[];
  minimo: NivelModulo;
};

type ManutencaoRouteRule = {
  match: 'prefix';
  prefix: string;
  requirement: ModuloRequirement | AnyModuloRequirement;
};

function modulo(
  moduloId: InternoModuloId,
  minimo: NivelModulo,
): ModuloRequirement {
  return { kind: 'modulo', modulo: moduloId, minimo };
}

function anyModulo(
  modulos: InternoModuloId[],
  minimo: NivelModulo,
): AnyModuloRequirement {
  return { kind: 'anyModulo', modulos, minimo };
}

/** Mais específico primeiro. Peças vem antes do prefixo genérico da fila. */
export const MANUTENCAO_ROUTE_RULES: ManutencaoRouteRule[] = [
  {
    match: 'prefix',
    prefix: '/manutencao/solicitantes',
    requirement: modulo('interno_manutencao', 'administrar'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao/maquinas',
    requirement: modulo('interno_manutencao', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao/pecas',
    requirement: modulo('interno_manutencao', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao',
    requirement: anyModulo(
      ['interno_manutencao', 'interno_manutencao_solicitacao'],
      'ler',
    ),
  },
];
