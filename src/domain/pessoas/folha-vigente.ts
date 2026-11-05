import type { FolhaPacote } from './folha-balde';

export type FolhaVigenciaBruta = FolhaPacote & {
  colaboradorId: string;
  inicio: string;
};

export class FolhaVigente {
  porPessoa(vigencias: FolhaVigenciaBruta[], hoje: string): Map<string, FolhaPacote> {
    const escolhida = new Map<string, FolhaVigenciaBruta>();
    for (const vigencia of vigencias) {
      if (vigencia.inicio > hoje) continue;
      const atual = escolhida.get(vigencia.colaboradorId);
      if (!atual || vigencia.inicio > atual.inicio) escolhida.set(vigencia.colaboradorId, vigencia);
    }
    return new Map([...escolhida].map(([id, item]) => [id, this.pacote(item)]));
  }

  private pacote(item: FolhaVigenciaBruta): FolhaPacote {
    return {
      salarioCentavos: item.salarioCentavos,
      valeTransporteCentavos: item.valeTransporteCentavos,
      valeAlimentacaoCentavos: item.valeAlimentacaoCentavos,
      planoSaude: item.planoSaude,
    };
  }
}
