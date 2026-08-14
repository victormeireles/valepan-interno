import type { Database } from '@/types/database';

export type TipoReceitaConsumo = Database['public']['Enums']['tipo_receita'];

export type ProdutividadeConsumoChange = {
  produtoId: string;
  produtoNome: string;
  tipo: TipoReceitaConsumo;
  receitaId: string;
  quantidadeAntes: number;
  quantidadeDepois: number;
  receitaAntesId?: string | null;
  forcarReconciliar?: boolean;
};

export class InsumoConsumoProdutividadeFator {
  static calcular(quantidadeAntes: number, quantidadeDepois: number): number | null {
    if (quantidadeAntes <= 0 || quantidadeDepois <= 0) return null;
    if (quantidadeAntes === quantidadeDepois) return 1;
    return quantidadeAntes / quantidadeDepois;
  }

  /** Prefer `deveBackfill` — só detecta mudança de quantidade. */
  static mudou(change: ProdutividadeConsumoChange): boolean {
    return change.quantidadeAntes !== change.quantidadeDepois;
  }

  static deveBackfill(change: ProdutividadeConsumoChange): boolean {
    if (change.forcarReconciliar) return true;
    if (
      change.receitaAntesId != null &&
      change.receitaAntesId !== '' &&
      change.receitaAntesId !== change.receitaId
    ) {
      return true;
    }
    return change.quantidadeAntes !== change.quantidadeDepois;
  }
}
