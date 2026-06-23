export type EtapaCadeiaBarra = {
  slug: 'fermentacao' | 'forno' | 'embalagem';
  label: string;
  icon: string;
  produzido: number;
  meta: number;
  unidade: string;
  finalizada: boolean;
  estimativaAoVivo?: number | null;
  metaOp?: number;
  destaque: boolean;
};
