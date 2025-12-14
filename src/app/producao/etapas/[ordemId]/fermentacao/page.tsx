import { redirect } from 'next/navigation';
import FermentacaoStepClient from './FermentacaoStepClient';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function FermentacaoStepPage({ params }: PageProps) {
  const { ordemId } = await params;
  
  const result = await getProductionOrderWithProduct(ordemId);
  
  if (!result.success || !result.data) {
    redirect('/producao/fila');
  }

  return <FermentacaoStepClient ordemProducao={result.data} />;
}


