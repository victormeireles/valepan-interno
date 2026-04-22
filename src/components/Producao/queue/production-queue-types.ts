/** Carrinho disponível na fila (dados agregados do servidor + ordem). */
export interface CarrinhoFilaForno {
  log_id: string;
  carrinho: string;
  em_fermentacao: boolean;
  latas_registradas: number;
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
  fermentacao_carrinhos?: Array<{ log_id: string; carrinho: string; latas: number }>;
  carrinhos_disponiveis_forno?: Array<{
    log_id: string;
    carrinho: string;
    em_fermentacao: boolean;
    latas_registradas: number;
  }>;
  qtd_massa_finalizada?: number | null;
  /** True quando o join com a tabela produtos falhou (ex.: produto removido). */
  produtoJoinFaltando?: boolean;
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
    };
  } | null;
  /** Texto curto do estoque na planilha (cliente + produto), quando encontrado. */
  estoque_resumo?: string | null;
  /** Unidades de consumo já convertidas a partir da planilha (para conferência). */
  estoque_unidades_consumo?: number;
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
