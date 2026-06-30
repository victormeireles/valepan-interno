import type { TipoReceita } from '@/domain/receitas/tipo-receita-labels';

export type InsumoReceitaAssociacao = {
  ingredienteId: string;
  receitaId: string;
  receitaNome: string;
  receitaTipo: TipoReceita;
  receitaAtiva: boolean;
  quantidadePadrao: number;
};
