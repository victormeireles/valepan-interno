import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import FornoStepClient from './FornoStepClient';
import {
  getProductionOrderWithProduct,
  getTotalLatasEntradaFornoHoje,
} from '@/app/actions/producao-etapas-actions';
interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function EntradaFornoStepPage({ params }: PageProps) {
  const { ordemId } = await params;

  const result = await getProductionOrderWithProduct(ordemId);

  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('entrada_forno'));
  }

  const totalLatasEntradaFornoHoje = await getTotalLatasEntradaFornoHoje();

  return (
    <FornoStepClient
      ordemProducao={result.data}
      totalLatasEntradaFornoHoje={totalLatasEntradaFornoHoje}
    />
  );
}
