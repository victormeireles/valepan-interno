import type { ProducaoData } from '@/domain/types';

export const LOTE_PADRAO_LATAS_ETAPA = 20;
export const LOTE_PADRAO_CAIXAS_EMBALAGEM = 50;

export type ProducaoLoteAtalho = 'etapa-latas' | 'embalagem-caixas';
export type ProducaoLoteCampoQuantidade = 'caixas' | 'unidades';
export type ProducaoLoteAtalhoUnidade = 'LT' | 'cx' | 'UN';

export class ProducaoLoteAtalhoManager {
  calcularSaldoRestante(metaReferencia: number, produzidoAtual: number): number {
    return Math.max(0, metaReferencia - produzidoAtual);
  }

  deveExibirAtalhoSaldoRestante(saldoRestante: number, lotePadrao: number): boolean {
    return saldoRestante > 0 && saldoRestante < lotePadrao;
  }

  formatarRotuloAtalho(valor: number, unidade: ProducaoLoteAtalhoUnidade): string {
    return `${valor} ${unidade}`;
  }

  aplicar(data: ProducaoData, atalho: ProducaoLoteAtalho): ProducaoData {
    if (atalho === 'etapa-latas') {
      return { ...data, caixas: LOTE_PADRAO_LATAS_ETAPA };
    }

    return { ...data, caixas: LOTE_PADRAO_CAIXAS_EMBALAGEM };
  }

  aplicarValor(
    data: ProducaoData,
    campo: ProducaoLoteCampoQuantidade,
    valor: number,
  ): ProducaoData {
    return { ...data, [campo]: valor };
  }
}

const manager = new ProducaoLoteAtalhoManager();

export function calcularSaldoLoteRestante(
  metaReferencia: number,
  produzidoAtual: number,
): number {
  return manager.calcularSaldoRestante(metaReferencia, produzidoAtual);
}

export function deveExibirAtalhoSaldoRestante(
  saldoRestante: number,
  lotePadrao: number,
): boolean {
  return manager.deveExibirAtalhoSaldoRestante(saldoRestante, lotePadrao);
}

export function formatarRotuloAtalhoLote(
  valor: number,
  unidade: ProducaoLoteAtalhoUnidade,
): string {
  return manager.formatarRotuloAtalho(valor, unidade);
}

export function aplicarAtalhoLotePadrao(
  data: ProducaoData,
  atalho: ProducaoLoteAtalho,
): ProducaoData {
  return manager.aplicar(data, atalho);
}

export function aplicarAtalhoLoteValor(
  data: ProducaoData,
  campo: ProducaoLoteCampoQuantidade,
  valor: number,
): ProducaoData {
  return manager.aplicarValor(data, campo, valor);
}
