export type ReceitaPlanilhaLinhaParseada = {
  nomeColado: string;
  quantidade: number;
};

export type ReceitaImportMatchStatus = 'matched' | 'review' | 'not_found';

export type ReceitaImportLinhaRevisao = {
  id: string;
  nomeColado: string;
  quantidade: number;
  insumoId: string | null;
  insumoNome: string | null;
  unidadeDescricao: string | null;
  custoUnitario?: number | null;
  status: ReceitaImportMatchStatus;
  score: number | null;
  skippedDuplicate?: boolean;
};
