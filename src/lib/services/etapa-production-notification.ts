import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

function formatDateTimeToBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function deriveProducedKg(
  meta: { assadeiras: number; unidades: number; kg: number },
  produzido: { assadeiras: number; unidades: number },
): number {
  if (meta.kg <= 0) return 0;
  if (meta.assadeiras > 0) {
    return Number(((produzido.assadeiras / meta.assadeiras) * meta.kg).toFixed(2));
  }
  if (meta.unidades > 0) {
    return Number(((produzido.unidades / meta.unidades) * meta.kg).toFixed(2));
  }
  return 0;
}

function buildMetaFromOrdem(ordem: OrdemProducaoRecord) {
  const assadeirasMode = resolveModoQuantidadeEtapa(ordem.assadeiraId) === 'assadeiras';
  return {
    latas: assadeirasMode ? ordem.assadeiras : 0,
    unidades: ordem.quantidade.unidades,
    kg: ordem.quantidade.kg,
  };
}

function aggregateProduzido(lotes: FermentacaoLoteRecord[]) {
  return lotes.reduce(
    (acc, item) => ({
      assadeiras: acc.assadeiras + Number(item.assadeiras || 0),
      unidades: acc.unidades + Number(item.unidades || 0),
    }),
    { assadeiras: 0, unidades: 0 },
  );
}

export async function notifyEtapaProductionAfterLoteSave(params: {
  stage: 'fermentacao' | 'forno';
  ordem: OrdemProducaoRecord;
  produtoNome: string;
  lotes: FermentacaoLoteRecord[];
}): Promise<void> {
  const meta = buildMetaFromOrdem(params.ordem);
  const produzidoAgg = aggregateProduzido(params.lotes);
  const payload = {
    produto: params.produtoNome,
    meta,
    produzido: {
      latas: produzidoAgg.assadeiras,
      unidades: produzidoAgg.unidades,
      kg: deriveProducedKg(
        {
          assadeiras: meta.latas,
          unidades: meta.unidades,
          kg: meta.kg,
        },
        produzidoAgg,
      ),
    },
    data: params.ordem.dataProducao,
    atualizadoEm: formatDateTimeToBr(new Date()),
  };

  if (params.stage === 'fermentacao') {
    await whatsAppNotificationService.notifyFermentacaoProduction(payload);
    return;
  }

  await whatsAppNotificationService.notifyFornoProduction(payload);
}
