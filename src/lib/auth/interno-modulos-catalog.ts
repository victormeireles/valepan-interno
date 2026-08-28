export const MODULOS_INTERNO = [
  'interno_fermentacao',
  'interno_forno',
  'interno_embalagem',
  'interno_saidas',
  'interno_painel',
  'interno_ordens',
  'interno_etiquetas',
  'interno_insumos',
  'interno_estoque',
  'interno_reclamacoes',
  'interno_config',
] as const;

export type InternoModuloId = (typeof MODULOS_INTERNO)[number];

export const NIVEIS = ['ler', 'editar', 'administrar'] as const;
export type NivelModulo = (typeof NIVEIS)[number];

export const NIVEL_ORDEM: Record<NivelModulo, number> = {
  ler: 1,
  editar: 2,
  administrar: 3,
};

export function isModuloInterno(value: string): value is InternoModuloId {
  return (MODULOS_INTERNO as readonly string[]).includes(value);
}

export function nivelAtende(
  atual: NivelModulo | undefined,
  minimo: NivelModulo,
): boolean {
  if (!atual) return false;
  return NIVEL_ORDEM[atual] >= NIVEL_ORDEM[minimo];
}
