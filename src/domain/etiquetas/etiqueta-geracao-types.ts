import type { ProdutoPesoInput } from '@/domain/assadeiras/produto-peso';

export type GerarEtiquetaRequest = {
  produtoId?: string;
  produto?: string;
  nomeEtiqueta?: string;
  dataFabricacao: string;
  lote: number;
  diasValidade?: number;
  // Aceitos por compatibilidade; não alteram o modelo 3a.
  diasValidadeCongelado?: number;
  congelado?: boolean;
  mostrarTextoCongelado?: boolean;
  cliente?: string;
};

export type EtiquetaProdutoRecord = ProdutoPesoInput & {
  id: string;
  categoriaId: string | null;
  categoriaNome: string | null;
  familiaNome: string | null;
  nomeEtiqueta: string | null;
  diasValidadeAmbiente: number;
  codigoBarras: string | null;
  unidadesPorCaixa: number | null;
  unidadesPorPacote: number | null;
};

export interface EtiquetaProdutoRepositoryPort {
  findProduto(input: Pick<GerarEtiquetaRequest, 'produtoId' | 'produto'>):
    Promise<EtiquetaProdutoRecord | null>;
  listPesosCategoria(categoriaId: string): Promise<ProdutoPesoInput[]>;
}

export type EtiquetaModelo = {
  titulo: string;
  categoria: string;
  dataFabricacao: string;
  lote: number;
  diasValidadeAmbiente: number;
  gramatura: number | null;
  gramaturasCategoria: number[];
  pesoLiquidoKg: number;
  unidadesPorCaixa: number;
  pacotesPorCaixa: number;
  codigoBarras: string;
};
