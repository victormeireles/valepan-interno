import type { Station } from '@/lib/utils/production-conversions';

export type EtapaFilaSyncPreRequisitos = Exclude<Station, 'massa'>;

export type EtapaSinteticaSync =
  | 'massa'
  | 'fermentacao'
  | 'entrada_forno'
  | 'saida_forno'
  | 'entrada_embalagem';

/**
 * Cadeia de etapas sintéticas gravadas ao «Adiantar / Confirmar etapas» a partir de cada posto da fila.
 *
 * Regra: adiantar completa apenas as etapas ANTERIORES — NUNCA a etapa atual. A etapa imediatamente
 * anterior é preenchida com carrinhos «fake» (ver {@link etapaAnteriorParaCarrinhos}) para que o
 * operador registe a etapa atual manualmente, escolhendo esses carrinhos.
 */
export function chainParaEtapa(
  etapaFila: EtapaFilaSyncPreRequisitos,
): EtapaSinteticaSync[] {
  switch (etapaFila) {
    case 'fermentacao':
      return ['massa'];
    case 'entrada_forno':
      // Fica disponível em fermentação; entrada no forno continua manual.
      return ['massa', 'fermentacao'];
    case 'saida_forno':
      // Fica disponível na entrada do forno; saída do forno continua manual.
      return ['massa', 'fermentacao', 'entrada_forno'];
    case 'entrada_embalagem':
      // Fica disponível na saída do forno; entrada na embalagem continua manual.
      return ['massa', 'fermentacao', 'entrada_forno', 'saida_forno'];
    case 'saida_embalagem':
      // Fica disponível na entrada na embalagem; saída da embalagem continua manual.
      return ['massa', 'fermentacao', 'entrada_forno', 'saida_forno', 'entrada_embalagem'];
    default:
      return [];
  }
}

/**
 * Etapa imediatamente anterior à etapa da fila — é onde os carrinhos «fake» (múltiplos de 20)
 * são criados para alimentar o seletor da etapa atual.
 */
export function etapaAnteriorParaCarrinhos(
  etapaFila: EtapaFilaSyncPreRequisitos,
): Exclude<EtapaSinteticaSync, 'massa'> | null {
  switch (etapaFila) {
    case 'entrada_forno':
      return 'fermentacao';
    case 'saida_forno':
      return 'entrada_forno';
    case 'entrada_embalagem':
      return 'saida_forno';
    case 'saida_embalagem':
      return 'entrada_embalagem';
    default:
      // Fermentação cadastra carrinhos manualmente; não há etapa-fonte com carrinhos.
      return null;
  }
}

