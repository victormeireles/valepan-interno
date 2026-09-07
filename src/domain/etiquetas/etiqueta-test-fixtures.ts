import type { EtiquetaProdutoRecord, GerarEtiquetaRequest } from './etiqueta-geracao-types';

export const etiquetaProdutoFixture: EtiquetaProdutoRecord = {
  id: 'a37c94a2-52d6-4c58-bae6-eb74d6372a7e',
  nome: 'HB Brioche Gergelim Duo 65g',
  nomeEtiqueta: 'Nome antigo 65g',
  familiaNome: 'Brioche Gergelim Duo',
  categoriaId: '45ccea9d-6d60-4ee9-a3ed-8e797b4976f5',
  categoriaNome: 'Hambúrguer',
  unit_weight: 65,
  diasValidadeAmbiente: 21,
  unidadesPorCaixa: 48,
  unidadesPorPacote: 6,
  codigoBarras: '609963303892',
};

export const etiquetaRequestFixture: GerarEtiquetaRequest = {
  produtoId: etiquetaProdutoFixture.id,
  dataFabricacao: '2026-09-03',
  lote: 246,
};
