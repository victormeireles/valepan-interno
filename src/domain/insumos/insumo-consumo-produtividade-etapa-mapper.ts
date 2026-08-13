import type { TipoReceitaConsumo } from '@/domain/insumos/insumo-consumo-produtividade-change';
import type { InsumoMovimentoLoteColuna } from '@/data/insumos/InsumoEstoqueRepository';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';

export type ConsumoProdutividadeEtapa = {
  coluna: InsumoMovimentoLoteColuna;
  origem: InsumoMovimentoOrigem;
  usaFatorSeguro: boolean;
};

export class InsumoConsumoProdutividadeEtapaMapper {
  static fromTipo(tipo: TipoReceitaConsumo): ConsumoProdutividadeEtapa | null {
    switch (tipo) {
      case 'massa':
        return {
          coluna: 'fermentacao_lote_id',
          origem: 'producao_fermentacao',
          usaFatorSeguro: true,
        };
      case 'brilho':
      case 'confeito':
        return {
          coluna: 'forno_lote_id',
          origem: 'producao_forno',
          usaFatorSeguro: true,
        };
      case 'antimofo':
        return {
          coluna: 'embalagem_lote_id',
          origem: 'producao_embalagem',
          usaFatorSeguro: true,
        };
      case 'embalagem':
      case 'caixa':
        return {
          coluna: 'embalagem_lote_id',
          origem: 'producao_embalagem',
          usaFatorSeguro: false,
        };
      default:
        return null;
    }
  }
}
