import type { Quantidade } from '@/domain/types/inventario';

export function criarQuantidadeZerada(): Quantidade {
  return { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
}

export function clampZero(value: number): number {
  return value < 0 ? 0 : value;
}

export function somarQuantidades(
  a: Quantidade,
  b: Quantidade,
  allowNegative = false,
): Quantidade {
  const kgSomado = parseFloat((a.kg + (b.kg || 0)).toFixed(3));
  const caixas = a.caixas + (b.caixas || 0);
  const pacotes = a.pacotes + (b.pacotes || 0);
  const unidades = a.unidades + (b.unidades || 0);

  if (allowNegative) {
    return { caixas, pacotes, unidades, kg: kgSomado };
  }
  return {
    caixas: clampZero(caixas),
    pacotes: clampZero(pacotes),
    unidades: clampZero(unidades),
    kg: clampZero(kgSomado),
  };
}

export function calcularDelta(atual: Quantidade, novo: Quantidade): Quantidade {
  return {
    caixas: novo.caixas - (atual.caixas || 0),
    pacotes: novo.pacotes - (atual.pacotes || 0),
    unidades: novo.unidades - (atual.unidades || 0),
    kg: parseFloat(((novo.kg || 0) - (atual.kg || 0)).toFixed(3)),
  };
}

export function aplicarDeltaComClamp(
  atual: Quantidade,
  delta: Quantidade,
  allowNegative = false,
): { saldo: Quantidade; delta: Quantidade } {
  const saldo = somarQuantidades(atual, delta, allowNegative);
  return { saldo, delta };
}
