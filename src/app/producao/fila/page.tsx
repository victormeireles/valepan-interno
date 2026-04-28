import { getProductionQueue } from '@/app/actions/producao-actions';
import { getTotalLatasEntradaFornoHoje } from '@/app/actions/producao-etapas-actions';
import { parseFilaDataQuery } from '@/lib/production/production-station-routes';
import ProductionQueueClient from './ProductionQueueClient';

export const dynamic = 'force-dynamic';

interface FilaPageProps {
  searchParams: Promise<{ station?: string; data?: string }>;
}

interface QueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  assadeira_id?: string | null;
  qtd_planejada: number;
  status?: string | null;
  prioridade?: number | null;
  created_at?: string | null;
  data_producao?: string | null;
  ordem_planejamento?: number | null;
  receitas_batidas?: number;
  receitas_fermentacao?: number;
  fermentacao_volume_concluido?: number;
  forno_volume_concluido?: number;
  /** Soma de LT registradas na entrada do forno (abertas + concluídas). */
  forno_entrada_latas_total?: number;
  /** Bandejas já registradas na saída do forno (1 bandeja = 1 LT na fila). */
  saida_forno_bandejas_total?: number;
  entrada_embalagem_latas_total?: number;
  fermentacao_carrinhos?: Array<{ log_id: string; carrinho: string; latas: number }>;
  carrinhos_disponiveis_forno?: Array<{
    log_id: string;
    carrinho: string;
    em_fermentacao: boolean;
    latas_registradas: number;
    ordenacao_fermentacao_ms: number;
  }>;
  qtd_massa_finalizada?: number | null;
  lata_tipo_nome?: string | null;
  /** True quando o join com `produtos` falhou (ex.: produto apagado ou FK inválida). */
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
      somente_lata_antiga?: boolean | null;
    };
  } | null;
}

export default async function FilaPage({ searchParams }: FilaPageProps) {
  const params = await searchParams;
  const queue = await getProductionQueue();
  const station = params?.station || 'planejamento';
  const filterDateIso = parseFilaDataQuery(params?.data ?? null);
  const totalLatasEntradaFornoHoje = await getTotalLatasEntradaFornoHoje(
    filterDateIso ?? undefined,
  );

  return (
    <ProductionQueueClient
      initialQueue={queue as unknown as QueueItem[]}
      station={station}
      totalLatasEntradaFornoHoje={totalLatasEntradaFornoHoje}
      filterDateIso={filterDateIso}
    />
  );
}
