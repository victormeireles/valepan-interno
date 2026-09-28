export type FluxoOpApontamento = {
  ordemId: string;
  /** Dia civil em que o lote foi apontado (YYYY-MM-DD). */
  dia: string;
  quantidade: number;
};

export type FluxoOpMeta = {
  ordemId: string;
  meta: number;
};

export type FluxoOpDiaFatia = {
  dateISO: string;
  diaCurto: string;
  quantidade: number;
};

export type FluxoOpResultado = {
  feito: number;
  meta: number;
  unitLabel: string;
  nesteDia: number;
  outrosDias: FluxoOpDiaFatia[];
};

export type FluxoOpResultadoView = {
  feito: number;
  meta: number;
  unitLabel: string;
  metaAtingida: boolean;
  delta: number;
  falta: number;
  barraPct: number | null;
  diaLinha: string | null;
};

type FluxoOpResultadoInput = {
  dateISO: string;
  unitLabel: string;
  metas: FluxoOpMeta[];
  apontamentos: FluxoOpApontamento[];
};

/** Agrega o feito da OP (todos os dias) e separa o dia civil selecionado. */
export class FluxoOpResultadoBuilder {
  build(input: FluxoOpResultadoInput): FluxoOpResultado | null {
    if (input.metas.length === 0) return null;
    const ids = new Set(input.metas.map((meta) => meta.ordemId));
    const porDia = this.somarPorDia(input.apontamentos, ids);
    const nesteDia = porDia.get(input.dateISO) ?? 0;
    return {
      feito: this.somar(porDia),
      meta: input.metas.reduce((total, meta) => total + meta.meta, 0),
      unitLabel: input.unitLabel,
      nesteDia,
      outrosDias: this.outrosDias(porDia, input.dateISO),
    };
  }

  private somarPorDia(
    apontamentos: FluxoOpApontamento[],
    ids: Set<string>,
  ): Map<string, number> {
    const porDia = new Map<string, number>();
    for (const apontamento of apontamentos) {
      if (!ids.has(apontamento.ordemId) || apontamento.quantidade <= 0) continue;
      porDia.set(
        apontamento.dia,
        (porDia.get(apontamento.dia) ?? 0) + apontamento.quantidade,
      );
    }
    return porDia;
  }

  private somar(porDia: Map<string, number>): number {
    let total = 0;
    for (const quantidade of porDia.values()) total += quantidade;
    return total;
  }

  private outrosDias(porDia: Map<string, number>, dateISO: string): FluxoOpDiaFatia[] {
    return [...porDia.entries()]
      .filter(([dia, quantidade]) => dia !== dateISO && quantidade > 0)
      .sort(([diaA], [diaB]) => diaA.localeCompare(diaB))
      .map(([dia, quantidade]) => ({
        dateISO: dia,
        diaCurto: diaCurto(dia, dateISO),
        quantidade,
      }));
  }
}

/** Números arredondados do cartão, na mesma conta da tela de realizado. */
export class FluxoOpResultadoPresenter {
  present(resultado: FluxoOpResultado): FluxoOpResultadoView {
    const feito = Math.round(resultado.feito);
    const meta = Math.round(resultado.meta);
    const delta = feito - meta;
    const metaAtingida = meta > 0 && delta >= 0;
    return {
      feito,
      meta,
      unitLabel: resultado.unitLabel,
      metaAtingida,
      delta,
      falta: Math.max(0, -delta),
      barraPct: this.barraPct(feito, meta),
      diaLinha: this.diaLinha(resultado),
    };
  }

  private barraPct(feito: number, meta: number): number | null {
    if (meta <= 0) return null;
    return Math.min(100, Math.round((feito / meta) * 100));
  }

  private diaLinha(resultado: FluxoOpResultado): string | null {
    if (resultado.outrosDias.length === 0) return null;
    const partes = [
      `${fmtQty(resultado.nesteDia)} neste dia`,
      ...resultado.outrosDias.map(
        (fatia) => `${fmtQty(fatia.quantidade)} no dia ${fatia.diaCurto}`,
      ),
    ];
    return partes.join(' · ');
  }
}

function fmtQty(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

function diaCurto(dateISO: string, referenciaISO: string): string {
  const [, refMonth] = referenciaISO.split('-');
  const [, month, day] = dateISO.split('-');
  if (month === refMonth) return String(Number(day));
  return `${day}/${month}`;
}
