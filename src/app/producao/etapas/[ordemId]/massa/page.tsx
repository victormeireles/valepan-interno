import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import MassaStepClient from './MassaStepClient';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';

interface PageProps {
  params: Promise<{ ordemId: string }>;
  searchParams: Promise<{ loteId?: string }>;
}

export default async function MassaStepPage({ params, searchParams }: PageProps) {
  const { ordemId } = await params;
  const { loteId } = await searchParams;
  
  const result = await getProductionOrderWithProduct(ordemId);
  
  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('massa'));
  }

  return (
    <MassaStepClient
      ordemProducao={result.data}
      initialLoteId={loteId}
    />
  );
}



