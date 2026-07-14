import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';

const INSUMOS_FORA_DO_CONTROLE = new Set(['agua', 'gelo']);

export class InsumoControleEstoqueFilter {
  filterSaldosControlaveis(saldos: InsumoSaldoComDetalhes[]): InsumoSaldoComDetalhes[] {
    return saldos.filter((saldo) => this.isControlavel(saldo.nome));
  }

  private isControlavel(nome: string): boolean {
    const nomeNormalizado = this.normalizeNome(nome);
    return !INSUMOS_FORA_DO_CONTROLE.has(nomeNormalizado);
  }

  private normalizeNome(nome: string): string {
    return nome
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}

export const insumoControleEstoqueFilter = new InsumoControleEstoqueFilter();
