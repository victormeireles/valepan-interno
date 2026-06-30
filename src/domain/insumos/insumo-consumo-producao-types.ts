import type {
  EtapaQuantidade,
  ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';

export type InsumoReceitaMassaIngrediente = {
  insumoId: string;
  quantidadePadrao: number;
};

export type InsumoReceitaMassaContexto = {
  produtoNome: string;
  quantidadePorProduto: number;
  ingredientes: InsumoReceitaMassaIngrediente[];
  unidadesPorAssadeira: number | null;
};

export type InsumoConsumoCalculado = {
  insumoId: string;
  quantidade: number;
};

export type InsumoConsumoCalculoInput = {
  lote: EtapaQuantidade;
  modo: ModoQuantidadeEtapa;
  contexto: InsumoReceitaMassaContexto;
};

export type InsumoConsumoCalculoResultado =
  | { ok: true; consumos: InsumoConsumoCalculado[] }
  | { ok: false; motivo: string };
