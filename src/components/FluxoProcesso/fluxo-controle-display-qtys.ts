import { FluxoControleStatus } from '@/domain/fluxo-processo/controle/fluxo-controle-status';
import type { FluxoControleEtapaNumeros } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type {
  FluxoEtapaKey,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';

export type FluxoControleDisplayQtys = {
  estaDisplay: number;
  deveriaDisplay: number;
  objetivoDisplay: number;
  deltaDisplay: number;
  status: FluxoControleEtapaNumeros['status'];
  /** esta / objetivo (OP do dia), cap 100. */
  barraOpPct: number | null;
  /** esta / deveria (relógio), cap 100. */
  barraPct: number | null;
};

const statusResolver = new FluxoControleStatus();

/**
 * Card: LT = assadeiras da OP; CX = caixas da OP.
 * Não converter CX→LT com média do dia.
 */
export class FluxoControleDisplayQtysBuilder {
  build(
    scale: FluxoDisplayScale,
    fluxo: VpFluxoPayload,
    etapa: FluxoEtapaKey,
    numeros: FluxoControleEtapaNumeros,
  ): FluxoControleDisplayQtys {
    const objetivoDisplay = this.objetivoDisplay(scale, fluxo, numeros);
    const deveriaDisplay = this.previstoDisplay(scale, numeros, 'deveria');
    const estaDisplay = this.estaDisplay(scale, etapa, numeros);
    const deltaDisplay = estaDisplay - deveriaDisplay;
    return {
      estaDisplay,
      deveriaDisplay,
      objetivoDisplay,
      deltaDisplay,
      status: statusResolver.resolve(estaDisplay, deveriaDisplay),
      barraOpPct: this.barraPct(estaDisplay, objetivoDisplay),
      barraPct: this.barraPct(estaDisplay, deveriaDisplay),
    };
  }

  private estaDisplay(
    scale: FluxoDisplayScale,
    etapa: FluxoEtapaKey,
    numeros: FluxoControleEtapaNumeros,
  ): number {
    if (etapa === 'emb') {
      if (scale.mode === 'cx') return numeros.estaUn;
      return Math.max(0, scale.etapaTotal('emb') - scale.opAnteriorTotal());
    }
    if (scale.mode === 'lt') return numeros.estaUn;
    return scale.etapaTotal(etapa);
  }

  private objetivoDisplay(
    scale: FluxoDisplayScale,
    fluxo: VpFluxoPayload,
    numeros: FluxoControleEtapaNumeros,
  ): number {
    if (!fluxo.controle) return 0;
    return this.previstoDisplay(scale, numeros, 'objetivo');
  }

  private previstoDisplay(
    scale: FluxoDisplayScale,
    numeros: FluxoControleEtapaNumeros,
    campo: 'objetivo' | 'deveria',
  ): number {
    if (scale.mode === 'lt') {
      return campo === 'objetivo' ? numeros.objetivoLt : numeros.deveriaLt;
    }
    if (scale.mode === 'cx') {
      return campo === 'objetivo' ? numeros.objetivoCx : numeros.deveriaCx;
    }
    if (numeros.objetivoUn <= 0) return 0;
    const nativo = campo === 'objetivo' ? numeros.objetivoUn : numeros.deveriaUn;
    return nativo;
  }

  private barraPct(estaDisplay: number, deveriaDisplay: number): number | null {
    if (deveriaDisplay <= 0) return null;
    return Math.min(100, Math.round((estaDisplay / deveriaDisplay) * 100));
  }
}
