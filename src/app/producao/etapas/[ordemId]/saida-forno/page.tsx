import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import SaidaFornoStepClient from './SaidaFornoStepClient';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function SaidaFornoStepPage({ params }: PageProps) {
  const { ordemId } = await params;

  const result = await getProductionOrderWithProduct(ordemId);

  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('saida_forno'));
  }

  return (
    <SaidaFornoStepClient ordemProducao={result.data} />
  );
}
