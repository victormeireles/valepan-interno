export type InsumoCustoEstado = 'pendente' | 'sem_custo' | 'com_custo';

export function resolveInsumoCustoEstado(
  custoUnitario: number | null | undefined,
): InsumoCustoEstado {
  if (custoUnitario == null) return 'pendente';
  if (custoUnitario === 0) return 'sem_custo';
  return 'com_custo';
}

export function custoUnitarioFromForm(
  estado: InsumoCustoEstado,
  valorDigitado: number | null | undefined,
): number | null {
  if (estado === 'pendente') return null;
  if (estado === 'sem_custo') return 0;
  if (valorDigitado == null || valorDigitado <= 0) return null;
  return valorDigitado;
}

export function estadoInicialFromCusto(
  custoUnitario: number | null | undefined,
): InsumoCustoEstado {
  return resolveInsumoCustoEstado(custoUnitario);
}
