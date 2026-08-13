import type { Database } from '@/types/database';

export type TipoReceitaConsumo = Database['public']['Enums']['tipo_receita'];

export type ProdutividadeConsumoChange = {
  produtoId: string;
  produtoNome: string;
  tipo: TipoReceitaConsumo;
  receitaId: string;
  quantidadeAntes: number;
  quantidadeDepois: number;
};

export class InsumoConsumoProdutividadeFator {
  static calcular(quantidadeAntes: number, quantidadeDepois: number): number | null {
    if (quantidadeAntes <= 0 || quantidadeDepois <= 0) return null;
    if (quantidadeAntes === quantidadeDepois) return 1;
    return quantidadeAntes / quantidadeDepois;
  }

  static mudou(change: ProdutividadeConsumoChange): boolean {
    return change.quantidadeAntes !== change.quantidadeDepois;
  }
}
