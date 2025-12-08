import { redirect } from 'next/navigation';
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
    redirect('/producao/fila');
  }

  return <MassaStepClient ordemProducao={result.data} initialLoteId={loteId} />;
}



