import { handleEtapaReabrirPost } from '@/lib/api/producao/etapa-reabrir-route-handler';

export async function POST(
  _request: Request,
  context: { params: Promise<{ pedidoEmbalagemId: string }> },
) {
  const { pedidoEmbalagemId } = await context.params;
  return handleEtapaReabrirPost(pedidoEmbalagemId, 'embalagem');
}
