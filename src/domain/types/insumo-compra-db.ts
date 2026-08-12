export type InsumoRegraCompraRow = {
  insumo_id: string;
  lead_time_dias: number;
  janela_tipo: 'qualquer' | 'dias_semana';
  dias_semana: number[] | null;
  quantidade_minima: number | null;
  quantidade_maxima: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type InsumoDistribuidorRow = {
  id: string;
  insumo_id: string;
  nome: string;
  preferencial: boolean;
  ordem: number;
  created_at: string;
};
