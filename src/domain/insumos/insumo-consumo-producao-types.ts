import type {
  EtapaQuantidade,
  ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';

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

/**
 * Contexto de consumo de insumos por receita/tipo em uma etapa de produção.
 * `quantidadePorProduto` muda de semântica conforme o tipo:
 *  - massa/brilho/confeito/antimofo = pães por receita
 *  - embalagem = pães por pacote
 *  - caixa = pacotes por caixa
 */
export type InsumoReceitaTipoContexto = {
  tipo: TipoReceita;
  quantidadePorProduto: number;
  ingredientes: InsumoReceitaMassaIngrediente[];
};

export type InsumoReceitaProducaoContexto = {
  produtoNome: string;
  unidadesPorAssadeira: number | null;
  receitas: InsumoReceitaTipoContexto[];
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
