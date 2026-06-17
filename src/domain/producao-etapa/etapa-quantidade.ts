export type ModoQuantidadeEtapa = 'assadeiras' | 'unidades';

export type EtapaQuantidade = {
  assadeiras: number;
  unidades: number;
};

export function resolveModoQuantidadeEtapa(
  assadeiraId: string | null | undefined,
): ModoQuantidadeEtapa {
  return assadeiraId ? 'assadeiras' : 'unidades';
}

export function somarLotesEtapa(lotes: EtapaQuantidade[]): EtapaQuantidade {
  return lotes.reduce(
    (acc, l) => ({
      assadeiras: acc.assadeiras + Number(l.assadeiras || 0),
      unidades: acc.unidades + Number(l.unidades || 0),
    }),
    { assadeiras: 0, unidades: 0 },
  );
}

export function derivarEscalarEtapa(
  pedido: EtapaQuantidade,
  produzido: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): { unidade: 'lt' | 'un'; aProduzir: number; produzido: number } {
  if (modo === 'assadeiras') {
    return {
      unidade: 'lt',
      aProduzir: pedido.assadeiras,
      produzido: produzido.assadeiras,
    };
  }
  return {
    unidade: 'un',
    aProduzir: pedido.unidades,
    produzido: produzido.unidades,
  };
}

export function calcularSaldoEtapa(
  pedido: EtapaQuantidade,
  produzido: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): number {
  const escalar = derivarEscalarEtapa(pedido, produzido, modo);
  return Math.max(0, escalar.aProduzir - escalar.produzido);
}

export function validarQuantidadeLote(
  qty: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): void {
  if (modo === 'assadeiras' && qty.assadeiras <= 0) {
    throw new Error('Informe assadeiras maior que zero.');
  }
  if (modo === 'unidades' && qty.unidades <= 0) {
    throw new Error('Informe unidades maior que zero.');
  }
}
