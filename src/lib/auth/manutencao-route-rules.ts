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

/** Mesmo conjunto de `MODULOS_MANUTENCAO_ENTRADA` (domínio); literal aqui evita ciclo de import. */
const MODULOS_ENTRADA_MANUTENCAO: InternoModuloId[] = [
  'interno_manutencao',
  'interno_fermentacao',
  'interno_forno',
  'interno_embalagem',
];

/** Mais específico primeiro. Indicadores, nova, ordens, peças e preventiva vêm antes da fila. */
export const MANUTENCAO_ROUTE_RULES: ManutencaoRouteRule[] = [
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
    prefix: '/manutencao/preventiva',
    requirement: modulo('interno_manutencao', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao/indicadores',
    requirement: modulo('interno_manutencao', 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao/nova',
    requirement: anyModulo([...MODULOS_ENTRADA_MANUTENCAO], 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao/ordens',
    requirement: anyModulo([...MODULOS_ENTRADA_MANUTENCAO], 'ler'),
  },
  {
    match: 'prefix',
    prefix: '/manutencao',
    requirement: anyModulo([...MODULOS_ENTRADA_MANUTENCAO], 'ler'),
  },
];
