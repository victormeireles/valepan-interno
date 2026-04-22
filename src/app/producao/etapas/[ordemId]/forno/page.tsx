import { redirect } from 'next/navigation';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

/** Rota antiga: /forno → /entrada-forno */
export default async function FornoLegacyRedirect({ params }: PageProps) {
  const { ordemId } = await params;
  redirect(etapaPathForOrdem(ordemId, 'entrada_forno'));
}
