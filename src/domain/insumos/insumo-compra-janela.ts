export type InsumoCompraJanelaTipo = 'qualquer' | 'dias_semana';

export class InsumoCompraJanela {
  estaNaJanela(
    tipo: InsumoCompraJanelaTipo,
    diasSemana: number[] | null,
    dayOfWeek: number,
  ): boolean {
    if (tipo === 'qualquer') return true;
    return (diasSemana ?? []).includes(dayOfWeek);
  }

  diasAteProximoPermitido(
    tipo: InsumoCompraJanelaTipo,
    diasSemana: number[] | null,
    dayOfWeek: number,
  ): number {
    if (this.estaNaJanela(tipo, diasSemana, dayOfWeek)) return 0;
    const dias = diasSemana ?? [];
    let min = 7;
    for (const d of dias) {
      const delta = (d - dayOfWeek + 7) % 7;
      if (delta > 0 && delta < min) min = delta;
    }
    return min === 7 ? 0 : min;
  }
}

export const insumoCompraJanela = new InsumoCompraJanela();
