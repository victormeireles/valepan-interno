import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import FermentacaoStepClient from './FermentacaoStepClient';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function FermentacaoStepPage({ params }: PageProps) {
  const { ordemId } = await params;
  
  const result = await getProductionOrderWithProduct(ordemId);
  
  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('fermentacao'));
  }

  return (
    <FermentacaoStepClient ordemProducao={result.data} />
  );
}







