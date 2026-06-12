export type AssadeiraOrigem = 'excecao' | 'regra' | 'pendente';

export type ProdutoComAssadeirasResumo = {
  id: string;
  nome: string;
  categoria_id: string;
  categoria_nome: string;
  linkCount: number;
  assadeiraOrigem: AssadeiraOrigem;
  assadeiraResolvidaCount: number;
  semAssadeira: boolean;
};

export type ProdutoAssadeiraLink = {
  id: string;
  produto_id: string;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  ordem: number;
  assadeira_nome: string;
  assadeira_padrao: number | null;
  assadeira_ativo: boolean;
  unidades_efetivas: number | null;
};
