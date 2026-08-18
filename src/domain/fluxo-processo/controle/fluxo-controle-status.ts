import type {
  FluxoControleEtapaNumeros,
  FluxoControleStatusBand,
} from './fluxo-controle-types';

export class FluxoControleStatus {
  resolve(estaUn: number, deveriaUn: number): FluxoControleStatusBand {
    if (deveriaUn === 0 && estaUn === 0) {
      return 'no plano';
    }

    const ratio = (estaUn - deveriaUn) / Math.max(deveriaUn, 1);

    if (Math.abs(ratio) <= 0.05) {
      return 'no plano';
    }

    return estaUn < deveriaUn ? 'atrasado' : 'adiantado';
  }

  numeros(
    objetivoUn: number,
    deveriaUn: number,
    estaUn: number,
  ): FluxoControleEtapaNumeros {
    return {
      objetivoUn,
      deveriaUn,
      estaUn,
      deltaUn: estaUn - deveriaUn,
      status: this.resolve(estaUn, deveriaUn),
      objetivoLt: 0,
      deveriaLt: 0,
      objetivoCx: 0,
      deveriaCx: 0,
    };
  }
}
