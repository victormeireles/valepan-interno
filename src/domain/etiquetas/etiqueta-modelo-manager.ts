import { resolvePesoGramas, type ProdutoPesoInput } from '@/domain/assadeiras/produto-peso';
import type {
  EtiquetaModelo, EtiquetaProdutoRecord, GerarEtiquetaRequest,
} from './etiqueta-geracao-types';
import { EtiquetaTituloManager } from './etiqueta-titulo-manager';

export class EtiquetaModeloManager {
  constructor(private readonly tituloManager = new EtiquetaTituloManager()) {}

  build(
    request: GerarEtiquetaRequest,
    produto: EtiquetaProdutoRecord,
    pesosCategoria: ProdutoPesoInput[],
  ): EtiquetaModelo {
    const gramatura = resolvePesoGramas(produto);
    const unidadesPorCaixa = produto.unidadesPorCaixa ?? 0;
    const unidadesPorPacote = produto.unidadesPorPacote ?? 0;
    return {
      titulo: this.tituloManager.resolve(produto, request.nomeEtiqueta),
      categoria: produto.categoriaNome?.trim() || 'SEM CATEGORIA',
      dataFabricacao: request.dataFabricacao,
      lote: request.lote,
      diasValidadeAmbiente: request.diasValidade ?? produto.diasValidadeAmbiente,
      gramatura,
      gramaturasCategoria: this.resolveGramaturas([...pesosCategoria, produto]),
      pesoLiquidoKg: (gramatura ?? 0) * unidadesPorCaixa / 1000,
      unidadesPorCaixa,
      pacotesPorCaixa: unidadesPorPacote > 0 ? unidadesPorCaixa / unidadesPorPacote : 0,
      codigoBarras: produto.codigoBarras?.trim() ?? '',
    };
  }

  private resolveGramaturas(produtos: ProdutoPesoInput[]): number[] {
    const pesos = produtos.map(resolvePesoGramas).filter(
      (peso): peso is number => peso !== null && Number.isFinite(peso) && peso > 0,
    );
    return [...new Set(pesos)].sort((primeiro, segundo) => primeiro - segundo);
  }
}
