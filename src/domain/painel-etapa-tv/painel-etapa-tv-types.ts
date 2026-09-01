export type PainelEtapaTvLoteFonte = {
  loteId: string;
  ordemId: string;
  produtoNome: string;
  produzidoEm: string;
  quantidade: number;
};

export type PainelEtapaTvUltimoLote = PainelEtapaTvLoteFonte;

export type PainelEtapaTvOpFonte = {
  ordemId: string;
  ordemPlanejamento: number;
  finalizada: boolean;
  produzido: number;
};
