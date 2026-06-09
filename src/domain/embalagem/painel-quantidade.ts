import type { Quantidade } from '@/domain/types/inventario';
import {
  QuantityBreakdown,
  type QuantityBreakdownEntry,
} from '@/domain/valueObjects/QuantityBreakdown';

export type UnidadePrincipal = 'cx' | 'pct' | 'un' | 'kg';

export function somarQuantidades(items: Quantidade[]): Quantidade {
  return items.reduce(
    (acc, q) => ({
      caixas: acc.caixas + (q.caixas || 0),
      pacotes: acc.pacotes + (q.pacotes || 0),
      unidades: acc.unidades + (q.unidades || 0),
      kg: Number((acc.kg + Number(q.kg || 0)).toFixed(3)),
    }),
    { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
  );
}

export function derivarUnidadePrincipal(q: Quantidade): {
  unidade: UnidadePrincipal;
  valor: number;
} {
  if (q.caixas > 0) return { unidade: 'cx', valor: q.caixas };
  if (q.pacotes > 0) return { unidade: 'pct', valor: q.pacotes };
  if (q.unidades > 0) return { unidade: 'un', valor: q.unidades };
  if (q.kg > 0) return { unidade: 'kg', valor: q.kg };
  return { unidade: 'cx', valor: 0 };
}

/** Exibição e farol na tela de embalagem: apenas caixas e pacotes. */
export function derivarUnidadeEmbalagem(q: Pick<Quantidade, 'caixas' | 'pacotes'>): {
  unidade: 'cx' | 'pct';
  valor: number;
} {
  if (q.caixas > 0) return { unidade: 'cx', valor: q.caixas };
  if (q.pacotes > 0) return { unidade: 'pct', valor: q.pacotes };
  return { unidade: 'cx', valor: 0 };
}

export function buildEmbalagemDisplayEntries(
  q: Pick<Quantidade, 'caixas' | 'pacotes'>,
): QuantityBreakdownEntry[] {
  return QuantityBreakdown.buildEntries([
    { quantidade: q.caixas, unidade: 'cx' },
    { quantidade: q.pacotes, unidade: 'pct' },
  ]);
}

export function quantidadeTemSaldoPedido(q: Quantidade): boolean {
  return q.caixas + q.pacotes + q.unidades + Number(q.kg) > 0;
}

export function calcularSaldoPedido(pedido: Quantidade, produzido: Quantidade): Quantidade {
  return {
    caixas: Math.max(0, pedido.caixas - produzido.caixas),
    pacotes: Math.max(0, pedido.pacotes - produzido.pacotes),
    unidades: Math.max(0, pedido.unidades - produzido.unidades),
    kg: Number(Math.max(0, pedido.kg - produzido.kg).toFixed(3)),
  };
}

export type CamposRealizadoEmbalagem = {
  caixas: boolean;
  pacotes: boolean;
  unidades: boolean;
  kg: boolean;
};

const CAMPOS_TODOS: CamposRealizadoEmbalagem = {
  caixas: true,
  pacotes: true,
  unidades: true,
  kg: true,
};

export function resolverCamposRealizadoEmbalagem(meta: Quantidade): CamposRealizadoEmbalagem {
  if (meta.caixas > 0 || meta.pacotes > 0) {
    return { caixas: true, pacotes: true, unidades: false, kg: false };
  }
  if (meta.unidades > 0) {
    return { caixas: false, pacotes: false, unidades: true, kg: false };
  }
  if (meta.kg > 0) {
    return { caixas: false, pacotes: false, unidades: false, kg: true };
  }
  return CAMPOS_TODOS;
}
