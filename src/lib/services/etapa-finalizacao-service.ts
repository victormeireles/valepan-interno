import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

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

export class EtapaFinalizacaoService {
  assertEtapaNaoFinalizada(ordem: OrdemProducaoRecord, etapa: EtapaProducaoSlug): void {
    if (isEtapaFinalizada(ordem, etapa)) {
      throw new Error(`Etapa de ${etapaLabel(etapa)} já finalizada para esta ordem`);
    }
  }

  async aplicarAposSalvarLote(params: {
    ordemId: string;
    etapa: EtapaProducaoSlug;
    continuaProduzindo: boolean;
    totalProduzidoEtapa: number;
  }): Promise<OrdemProducaoRecord> {
    if (params.continuaProduzindo) {
      return ordemProducaoRepository.updateEtapaFinalizacao(params.ordemId, params.etapa, {
        finalizada: false,
        metaConfirmada: null,
      });
    }

    if (params.totalProduzidoEtapa <= 0) {
      throw new Error('Não é possível finalizar etapa sem produção registrada');
    }

    return ordemProducaoRepository.updateEtapaFinalizacao(params.ordemId, params.etapa, {
      finalizada: true,
      metaConfirmada: params.totalProduzidoEtapa,
    });
  }
}

export const etapaFinalizacaoService = new EtapaFinalizacaoService();
