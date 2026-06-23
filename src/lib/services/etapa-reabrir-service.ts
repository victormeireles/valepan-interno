import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { etapaFinalizacaoService } from '@/lib/services/etapa-finalizacao-service';

function isEtapaFinalizada(ordem: OrdemProducaoRecord, etapa: EtapaProducaoSlug): boolean {
  switch (etapa) {
    case 'fermentacao':
      return ordem.fermentacaoFinalizada;
    case 'forno':
      return ordem.fornoFinalizada;
    case 'embalagem':
      return ordem.embalagemFinalizada;
  }
}

function etapaLabel(etapa: EtapaProducaoSlug): string {
  switch (etapa) {
    case 'fermentacao':
      return 'fermentação';
    case 'forno':
      return 'forno';
    case 'embalagem':
      return 'embalagem';
  }
}

export class EtapaReabrirService {
  async reabrir(ordemId: string, etapa: EtapaProducaoSlug): Promise<void> {
    const ordem = await ordemProducaoRepository.findById(ordemId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    if (!isEtapaFinalizada(ordem, etapa)) {
      throw new Error(`Etapa de ${etapaLabel(etapa)} já está aberta`);
    }

    await etapaFinalizacaoService.reabrirEtapa(ordemId, etapa);
  }
}

export const etapaReabrirService = new EtapaReabrirService();
