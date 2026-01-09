import { getProductionQueue } from '@/app/actions/producao-actions';
import ProductionQueueClient from './ProductionQueueClient';

export const dynamic = 'force-dynamic';

interface FilaPageProps {
  searchParams: Promise<{ station?: string }>;
}

interface QueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  qtd_planejada: number;
  status?: string | null;
  prioridade?: number | null;
  created_at?: string | null;
  data_producao?: string | null;
  receitas_batidas?: number;
  receitas_fermentacao?: number;
  qtd_massa_finalizada?: number | null;
  produtos: {
    nome: string;
    unidadeNomeResumido: string | null;
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
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
}

export default async function FilaPage({ searchParams }: FilaPageProps) {
  const params = await searchParams;
  const queue = await getProductionQueue();
  const station = params?.station || 'planejamento';

  // Filtrar itens que não têm produtos e fazer type assertion
  const filteredQueue = queue.filter((item) => item.produtos != null) as unknown as QueueItem[];

  return <ProductionQueueClient initialQueue={filteredQueue} station={station} />;
}
