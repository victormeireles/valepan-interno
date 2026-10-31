import type { Regime } from './regime-cadastro';

export class RegimeTroca {
  avaliar(destino: Regime, avisoAtivo: boolean, situacao: string, dataDesligamento: string | null): void {
    if (destino === 'pj' && avisoAtivo) {
      throw new Error('Cancele o aviso antes de mudar o regime para PJ.');
    }
    if (destino === 'clt' && this.saidaPrevista('pj', situacao, dataDesligamento)) {
      throw new Error('Cancele a saída prevista antes de mudar o regime para CLT.');
    }
  }

  recusarExame(regime: Regime): void {
    if (regime === 'pj') throw new Error('Exame ocupacional vale só para CLT.');
  }

  saidaPrevista(regime: Regime, situacao: string, dataDesligamento: string | null): boolean {
    return regime === 'pj' && situacao !== 'desligado' && dataDesligamento !== null;
  }
}
