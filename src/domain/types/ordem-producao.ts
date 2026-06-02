export type OrdemProducaoStatus =
  | "rascunho"
  | "pronto"
  | "em_producao"
  | "concluido";

/** Valor em `tipo_lata` na ordem diária: UUID da assadeira em `produto_assadeiras` para o produto. */
export type OrdemProducaoLataSelecao = string;

export interface OrdemProducaoDiaria {
  id: string;
  dataProducao: string;
  dataEtiquetaDefault: string;
  status: OrdemProducaoStatus;
}

export interface OrdemProducaoItem {
  id: string;
  ordemId: string;
  prioridade: number;
  produtoId: string;
  tipoLata: OrdemProducaoLataSelecao;
  latasPlanejadas: number;
  caixasEstimadas: number;
  clientes: string[];
  dataProducaoOverride?: string;
  dataEtiquetaOverride?: string;
  /** Notas para embalagem (etiquetas, caixas, etc.). */
  observacaoEmbalagem?: string | null;
  /** Notas para a equipa de produção. */
  observacaoProducao?: string | null;
}
