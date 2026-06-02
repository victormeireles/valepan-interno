/**
 * Registos criados por «Adiantar / Confirmar etapas» na fila (sincronização de pré-requisitos).
 * O número de carrinho técnico (ex.: SYNC-…) não deve aparecer na interface.
 */

export const PRODUCAO_FILA_SYNC_FLAG = 'ajuste_manual_pre_requisitos_fila' as const;

export type EtapaRotuloAdiantado =
  | 'massa'
  | 'fermentacao'
  | 'entrada_forno'
  | 'saida_forno'
  | 'entrada_embalagem';

export function isNumeroCarrinhoSinteticoFila(numero: string | null | undefined): boolean {
  return String(numero ?? '')
    .trim()
    .toUpperCase()
    .startsWith('SYNC-');
}

/**
 * Nome automático «Adiantado N» (gerado quando o operador NÃO informou um número real de carrinho).
 * Usado para decidir se devemos exibir o número informado ou um rótulo genérico de adiantamento.
 */
export function isNomeCarrinhoAdiantadoPadrao(numero: string | null | undefined): boolean {
  return /^adiantado\s+\d+$/i.test(String(numero ?? '').trim());
}

/** `true` quando o número do carrinho foi informado pelo operador (não é técnico nem automático). */
export function temNumeroCarrinhoInformado(numero: string | null | undefined): boolean {
  const car = String(numero ?? '').trim();
  return (
    car.length > 0 &&
    car !== '—' &&
    !isNumeroCarrinhoSinteticoFila(car) &&
    !isNomeCarrinhoAdiantadoPadrao(car)
  );
}

export function isRegistroAdiantadoFila(dadosQualidade: unknown): boolean {
  if (dadosQualidade == null || typeof dadosQualidade !== 'object') return false;
  const d = dadosQualidade as Record<string, unknown>;
  if (d[PRODUCAO_FILA_SYNC_FLAG] === true) return true;
  const obs = String(d.observacoes ?? '');
  if (obs.includes(PRODUCAO_FILA_SYNC_FLAG)) return true;
  const motivo = String(d.motivo ?? '');
  if (/sincroniza[cç][aã]o\s+pr[eé]-requisitos/i.test(motivo)) return true;
  return false;
}

export function isRegistroAdiantadoFilaComCarrinho(
  dadosQualidade: unknown,
  numeroCarrinho?: string | null,
): boolean {
  return isRegistroAdiantadoFila(dadosQualidade) || isNumeroCarrinhoSinteticoFila(numeroCarrinho);
}

export function rotuloRegistroAdiantadoFila(
  etapa: EtapaRotuloAdiantado,
  quantidade?: { latas?: number; bandejas?: number; receitas?: number },
): string {
  switch (etapa) {
    case 'massa': {
      const r = quantidade?.receitas;
      if (r != null && r > 0) {
        return `Massa adiantada · ${r} receita${r === 1 ? '' : 's'}`;
      }
      return 'Massa adiantada';
    }
    case 'fermentacao': {
      const lt = quantidade?.latas;
      if (lt != null && lt > 0) return `Fermentação adiantada · ${Math.round(lt)} LT`;
      return 'Fermentação adiantada';
    }
    case 'entrada_forno': {
      const lt = quantidade?.latas;
      if (lt != null && lt > 0) return `Entrada no forno adiantada · ${Math.round(lt)} LT`;
      return 'Entrada no forno adiantada';
    }
    case 'saida_forno': {
      const b = quantidade?.bandejas ?? quantidade?.latas;
      if (b != null && b > 0) return `Saída do forno adiantada · ${Math.round(b)} LT`;
      return 'Saída do forno adiantada';
    }
    case 'entrada_embalagem': {
      const lt = quantidade?.latas;
      if (lt != null && lt > 0) return `Entrada na embalagem adiantada · ${Math.round(lt)} LT`;
      return 'Entrada na embalagem adiantada';
    }
  }
}

export function rotuloExibicaoRegistroFila(
  etapa: EtapaRotuloAdiantado,
  dadosQualidade: unknown,
  numeroCarrinho: string | null | undefined,
  quantidade?: { latas?: number; bandejas?: number; receitas?: number },
): string {
  if (isRegistroAdiantadoFilaComCarrinho(dadosQualidade, numeroCarrinho)) {
    // Carrinho «fake» nomeado pelo operador (ex.: 97): mostra o número para que ele o reconheça e selecione.
    if (temNumeroCarrinhoInformado(numeroCarrinho)) {
      return `Carrinho ${String(numeroCarrinho).trim()} (adiantado)`;
    }
    return rotuloRegistroAdiantadoFila(etapa, quantidade);
  }
  const car = String(numeroCarrinho ?? '').trim();
  if (!car || car === '—') {
    if (etapa === 'fermentacao') return 'Fermentação';
    if (etapa === 'saida_forno') return 'Saída do forno';
    if (etapa === 'entrada_embalagem') return 'Entrada embalagem';
    return '';
  }
  return `Carrinho ${car}`;
}

export function camposRotuloRegistroFila(
  etapa: EtapaRotuloAdiantado,
  dadosQualidade: unknown,
  numeroCarrinho: string | null | undefined,
  quantidade?: { latas?: number; bandejas?: number; receitas?: number },
  /** Ex.: fermentação vinculada à entrada no forno. */
  dadosQualidadeAlternativo?: unknown,
): { eh_registro_adiantado: boolean; rotulo_exibicao: string } {
  const eh_registro_adiantado =
    isRegistroAdiantadoFilaComCarrinho(dadosQualidade, numeroCarrinho) ||
    isRegistroAdiantadoFilaComCarrinho(dadosQualidadeAlternativo, numeroCarrinho);
  const dqRotulo = isRegistroAdiantadoFila(dadosQualidade)
    ? dadosQualidade
    : dadosQualidadeAlternativo ?? dadosQualidade;
  return {
    eh_registro_adiantado,
    rotulo_exibicao: rotuloExibicaoRegistroFila(etapa, dqRotulo, numeroCarrinho, quantidade),
  };
}

/** Texto único para listas (fila expandida, histórico). */
export function formatarLinhaListaRegistroFila(opts: {
  rotuloExibicao: string;
  latas?: number;
  bandejas?: number;
  ehRegistroAdiantado: boolean;
}): string {
  if (opts.ehRegistroAdiantado) return opts.rotuloExibicao;
  const qty = opts.latas ?? opts.bandejas;
  if (qty != null && Number.isFinite(qty)) {
    return `${opts.rotuloExibicao} · ${Math.round(qty)} LT`;
  }
  return opts.rotuloExibicao;
}
