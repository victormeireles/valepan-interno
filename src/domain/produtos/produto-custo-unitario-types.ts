export type ProdutoCustoTipoReceita =
  | 'massa'
  | 'brilho'
  | 'confeito'
  | 'antimofo'
  | 'embalagem'
  | 'caixa';

export type ProdutoCustoIngrediente = {
  insumoId: string;
  insumoNome: string;
  unidade: string | null;
  quantidadePadrao: number;
  custoUnitario: number | null;
};

export type ProdutoCustoVinculo = {
  tipo: ProdutoCustoTipoReceita;
  receitaId: string;
  receitaNome: string;
  quantidadePorProduto: number;
  ingredientes: ProdutoCustoIngrediente[];
};

export type ProdutoCustoVinculoAviso =
  | 'quantidade_invalida'
  | 'sem_ingredientes'
  | 'insumo_sem_custo';

export type ProdutoCustoVinculoResultado = {
  tipo: ProdutoCustoTipoReceita;
  receitaId: string;
  receitaNome: string;
  entraNoTotal: boolean;
  custoReceita: number;
  custoPorUnidade: number;
  avisos: ProdutoCustoVinculoAviso[];
};

export type ProdutoCustoTotal = {
  custoUnitario: number;
  porTipo: ProdutoCustoVinculoResultado[];
  insumoSemCusto: boolean;
};

export type ProdutoCustoComparacao = {
  antes: ProdutoCustoTotal;
  depois: ProdutoCustoTotal;
  deltaReais: number;
  deltaPercentual: number | null;
};

export type ProdutoCustoReceitaCatalogoItem = {
  id: string;
  nome: string;
  tipo: ProdutoCustoTipoReceita;
  ingredientes: ProdutoCustoIngrediente[];
};

export type ProdutoCustoTipoSelecao = {
  receitaId: string;
  quantidade: number | undefined;
};

export type ProdutoCustoCenarioInput = {
  vinculosAntes: ProdutoCustoVinculo[];
  catalogo: ProdutoCustoReceitaCatalogoItem[];
  selecao: Partial<Record<ProdutoCustoTipoReceita, ProdutoCustoTipoSelecao>>;
};

export type ProdutoCustoSimulacaoPayload = {
  produto: { id: string; nome: string };
  vinculos: ProdutoCustoVinculo[];
  receitasCatalogo: ProdutoCustoReceitaCatalogoItem[];
};
