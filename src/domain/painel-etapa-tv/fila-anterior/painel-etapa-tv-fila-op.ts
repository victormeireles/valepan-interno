export type PainelEtapaTvFilaEtapa = 'forno' | 'embalagem';

export type PainelEtapaTvFilaOp = {
  ordemId: string;
  produtoNome: string;
  assadeiraNome: string;
  observacao: string;
  prontoLt: number;
  vindoLt: number;
  feitoLt: number;
  metaLt: number | null;
  /** Lote mais antigo ainda na fila-gate (ISO); usado no FIFO. */
  oldestLoteEm: string;
  /** Minutos que o lote mais antigo está na fila-gate. */
  oldestNaFilaMin: number;
};

export type PainelEtapaTvFilaLtConverter = {
  unToLt(unidades: number, assadeiraNome: string): number;
};

/** Progresso da etapa atual (já em LT). Meta null = omitir Y/Z. */
export type PainelEtapaTvFilaOpProgresso = {
  feitoLt: number;
  metaLt: number | null;
};
