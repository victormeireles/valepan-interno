export const DIAS_UTEIS_POR_SEMANA = 5.5;

const MAX_DIAS_BUSCA = 3650;

export class InsumoCompraDiaOperacional {
  pesoDia(dayOfWeek: number): number {
    if (dayOfWeek === 0) return 0;
    if (dayOfWeek === 6) return 0.5;
    return 1;
  }

  somaPesos(dayOfWeekInicio: number, horizonteDias: number): number {
    if (horizonteDias <= 0) return 0;
    let soma = 0;
    for (let i = 0; i < horizonteDias; i++) {
      soma += this.pesoDia((dayOfWeekInicio + i) % 7);
    }
    return soma;
  }

  consumoDiaUtil(mediaSemanal: number): number {
    return mediaSemanal / DIAS_UTEIS_POR_SEMANA;
  }

  demandaHorizonte(
    consumoDiaUtil: number,
    dayOfWeekInicio: number,
    horizonteDias: number,
  ): number {
    return consumoDiaUtil * this.somaPesos(dayOfWeekInicio, horizonteDias);
  }

  coberturaCalendarioDias(
    estoque: number,
    consumoDiaUtil: number,
    dayOfWeekInicio: number,
  ): number {
    if (estoque <= 0 || consumoDiaUtil <= 0) return 0;
    return this.andarDiasAteDemanda(estoque, consumoDiaUtil, dayOfWeekInicio);
  }

  diasCalendarioParaDemanda(
    demandaAlvo: number,
    consumoDiaUtil: number,
    dayOfWeekInicio: number,
  ): number {
    if (demandaAlvo <= 0 || consumoDiaUtil <= 0) return 0;
    return this.andarDiasAteDemanda(demandaAlvo, consumoDiaUtil, dayOfWeekInicio);
  }

  private andarDiasAteDemanda(
    alvo: number,
    consumoDiaUtil: number,
    dayOfWeekInicio: number,
  ): number {
    let restante = alvo;
    let dias = 0;
    let dow = dayOfWeekInicio;
    while (restante > 0 && dias < MAX_DIAS_BUSCA) {
      const consumoDoDia = consumoDiaUtil * this.pesoDia(dow);
      if (consumoDoDia <= 0) {
        dias += 1;
        dow = (dow + 1) % 7;
        continue;
      }
      if (restante <= consumoDoDia) {
        dias += restante / consumoDoDia;
        return dias;
      }
      restante -= consumoDoDia;
      dias += 1;
      dow = (dow + 1) % 7;
    }
    return dias;
  }
}

export const insumoCompraDiaOperacional = new InsumoCompraDiaOperacional();
