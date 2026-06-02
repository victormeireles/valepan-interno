/** Saída de embalagem já registada (lista na fila expandida por OP). */
export type FilaSaidaEmbalagemRegistroRow = {
  log_id: string;
  caixas: number;
  em_andamento: boolean;
  /** Horário do lançamento (exibição). */
  registrado_em: string;
};

/** Entrada na embalagem já registada (lista na fila expandida por OP). */
export type FilaEntradaEmbalagemRegistroRow = {
  log_id: string;
  carrinho: string;
  latas: number;
  em_andamento: boolean;
  /** Máximo de LT editável (saldo da saída do forno vinculada). */
  max_latas_disponivel: number;
  bloqueado?: boolean;
  eh_registro_adiantado?: boolean;
  rotulo_exibicao?: string;
};

/** Saída do forno já registada (lista na fila expandida por OP). */
export type FilaSaidaFornoRegistroRow = {
  log_id: string;
  carrinho: string;
  bandejas: number;
  em_andamento: boolean;
  /** True quando já existe entrada na embalagem vinculada a este log. */
  bloqueado_na_embalagem?: boolean;
  eh_registro_adiantado?: boolean;
  rotulo_exibicao?: string;
};

/** Entrada no forno já registada (lista na fila expandida por OP). */
export type FilaEntradaFornoRegistroRow = {
  log_id: string;
  carrinho: string;
  latas: number;
  em_andamento: boolean;
  /** Teto de LT conforme fermentação vinculada (0 = sem teto). */
  max_latas_fermentacao: number;
  eh_registro_adiantado?: boolean;
  rotulo_exibicao?: string;
};

/** Carrinho já registado na fermentação (lista na fila expandida). */
export type FilaFermentacaoCarrinhoRow = {
  log_id: string;
  carrinho: string;
  latas: number;
  /** True quando já existe entrada no forno vinculada a este log. */
  bloqueado_no_forno?: boolean;
  eh_registro_adiantado?: boolean;
  rotulo_exibicao?: string;
};

/** Carrinho disponível na fila (dados agregados do servidor + ordem). */
export interface CarrinhoFilaForno {
  log_id: string;
  carrinho: string;
  em_fermentacao: boolean;
  latas_registradas: number;
  /** Menor = cadastrado há mais tempo na fermentação (FIFO na fila do forno). */
  ordenacao_fermentacao_ms: number;
  ordem_producao_id: string;
  lote_codigo: string;
  produto_nome: string;
  unidades_assadeira: number | null;
  pode_colocar_no_forno: boolean;
}

export interface ProductionQueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  /** Assadeira escolhida no planejamento (null = inferir pelo cadastro de latas do produto). */
  assadeira_id?: string | null;
  qtd_planejada: number;
  status?: string | null;
  prioridade?: number | null;
  created_at?: string | null;
  data_producao?: string | null;
  ordem_planejamento?: number | null;
  receitas_batidas?: number;
  receitas_fermentacao?: number;
  /** Volume já concluído na fermentação (LT ou un, alinhado à meta da OP). */
  fermentacao_volume_concluido?: number;
  forno_volume_concluido?: number;
  forno_entrada_latas_total?: number;
  saida_forno_bandejas_total?: number;
  /** Latas já registradas na entrada da embalagem (logs concluídos). */
  entrada_embalagem_latas_total?: number;
  /** Quantidade de registros concluídos na entrada da embalagem (lotes/carrinhos). */
  entrada_embalagem_registros_count?: number;
  /** Soma das caixas informadas em todos os lançamentos de saída de embalagem. */
  saida_embalagem_caixas_informadas?: number | null;
  saida_embalagem_registros?: FilaSaidaEmbalagemRegistroRow[];
  fermentacao_carrinhos?: FilaFermentacaoCarrinhoRow[];
  entrada_forno_entradas?: FilaEntradaFornoRegistroRow[];
  saida_forno_registros?: FilaSaidaFornoRegistroRow[];
  entrada_embalagem_registros?: FilaEntradaEmbalagemRegistroRow[];
  carrinhos_disponiveis_forno?: Array<{
    log_id: string;
    carrinho: string;
    em_fermentacao: boolean;
    latas_registradas: number;
    ordenacao_fermentacao_ms: number;
  }>;
  qtd_massa_finalizada?: number | null;
  /**
   * Nome da assadeira (tipo de lata) resolvido a partir do cadastro de latas do produto e do pedido/cliente.
   * Preenchido na fila de produção para exibição na etapa massa.
   */
  lata_tipo_nome?: string | null;
  /** True quando o join com a tabela produtos falhou (ex.: produto removido). */
  produtoJoinFaltando?: boolean;
  /** True quando a leitura em lote de `produtos` na fila falhou (produto pode existir no cadastro). */
  produtoCargaFilaErro?: boolean;
  produtos: {
    nome: string;
    unidadeNomeResumido: string | null;
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    unidades_lata_antiga?: number | null;
    unidades_lata_nova?: number | null;
    receita_massa?: {
      quantidade_por_produto: number;
    } | null;
  };
  pedidos?: {
    cliente_id: string;
    clientes?: {
      nome_fantasia: string;
      /** Se true, o fluxo prioriza a lata “antiga” (unidades_lata_antiga) na resolução do tipo. */
      somente_lata_antiga?: boolean | null;
    };
  } | null;
  /** Texto curto do resumo de estoque (cliente + produto), quando encontrado. */
  estoque_resumo?: string | null;
  /** Unidades de consumo já convertidas a partir do estoque (para conferência). */
  estoque_unidades_consumo?: number;
  /** Demanda planejada em unidades (latas×buracos quando OP tem lata). */
  planejado_unidades_consumo?: number;
  /**
   * Caixas planejadas conforme a ordem diária (já considerando o tipo de caixa escolhido).
   * Fonte de verdade da meta de caixas na saída de embalagem.
   */
  caixas_planejadas?: number | null;
  /**
   * Observação de produção escrita na ordem diária (ex.: «lavar a lata depois»).
   * Exibida em destaque nos cards da fila de massa e fermentação.
   */
  observacao_producao?: string | null;
  /**
   * Observação de embalagem escrita na ordem diária (ex.: «caixa lisa»).
   * Exibida em destaque nos cards da fila de entrada e saída de embalagem.
   */
  observacao_embalagem?: string | null;
  /**
   * Quantidade a exibir no planejamento: max(0, necessidade OP − estoque), na unidade cadastral.
   * A OP em base continua em {@link qtd_planejada}.
   */
  qtd_a_produzir_planejada?: number;
}

export interface ProductionQueueClientProps {
  initialQueue: ProductionQueueItem[];
  station?: string;
  /** Soma de latas na entrada do forno hoje (todas as ordens). Opcional para compatibilidade. */
  totalLatasEntradaFornoHoje?: number;
  /** `YYYY-MM-DD` — mostra só ordens com esta `data_producao`; omitir = todas as pendentes. */
  filterDateIso?: string | null;
}
