import { getProductionQueue } from '@/app/actions/producao-actions';
import ProductionQueueClient from './ProductionQueueClient';

export const dynamic = 'force-dynamic';

interface FilaPageProps {
  searchParams: Promise<{ station?: string }>;
}

export default async function FilaPage({ searchParams }: FilaPageProps) {
  const params = await searchParams;
  const queue = await getProductionQueue();
  const station = params?.station || 'planejamento';

  return <ProductionQueueClient initialQueue={queue} station={station} />;
}

