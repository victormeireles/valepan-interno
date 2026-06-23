import { handleEtapaReabrirPost } from '@/lib/api/producao/etapa-reabrir-route-handler';

export async function POST(
  _request: Request,
  context: { params: Promise<{ ordemId: string }> },
) {
  const { ordemId } = await context.params;
  return handleEtapaReabrirPost(ordemId, 'fermentacao');
}
