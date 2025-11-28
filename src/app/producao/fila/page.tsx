import { getProductionQueue } from '@/app/actions/producao-actions';
import ProductionQueueClient from './ProductionQueueClient';
import { ProductionQueueItem } from '@/domain/types/producao';

export const dynamic = 'force-dynamic';

export default async function FilaPage() {
  const queue = await getProductionQueue();

  return <ProductionQueueClient initialQueue={(queue || []) as unknown as ProductionQueueItem[]} />;
}

