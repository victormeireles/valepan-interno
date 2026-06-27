export type EtapaReabrirAcao = 'somente-reabrir' | 'reabrir-e-adicionar-lote';

export class EtapaReabrirAcaoPolicy {
  shouldOpenNovoLote(acao: EtapaReabrirAcao): boolean {
    return acao === 'reabrir-e-adicionar-lote';
  }
}

export const etapaReabrirAcaoPolicy = new EtapaReabrirAcaoPolicy();
