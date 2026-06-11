export type AssadeiraVinculoOrigem = 'excecao' | 'regra';

export type AssadeiraVinculoResolvido = {
  assadeira_id: string;
  assadeira_nome: string;
  unidades_por_assadeira: number | null;
  unidades_efetivas: number;
  assadeira_padrao: number | null;
  origem: AssadeiraVinculoOrigem;
};
