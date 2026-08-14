/**
 * Casamento FIFO genérico entre filas de origem e destino (já filtradas).
 */
export type FluxoFifoSlice = {
  produzidoEm: string;
  unidades: number;
};

export type FluxoFifoPair = {
  un: number;
  tOrigMs: number;
  tDestMs: number;
};

export type FluxoFifoTaggedSlice = FluxoFifoSlice & { tag: number };

export type FluxoFifoTaggedPair = FluxoFifoPair & { tag: number };

export class FluxoFifoMatcher {
  match(origem: FluxoFifoSlice[], destino: FluxoFifoSlice[]): FluxoFifoPair[] {
    return this.matchTagged(
      origem.map((r) => ({ ...r, tag: 0 })),
      destino,
    ).map(({ un, tOrigMs, tDestMs }) => ({ un, tOrigMs, tDestMs }));
  }

  /** FIFO preservando uma etiqueta da origem (ex.: índice da onda). */
  matchTagged(
    origem: FluxoFifoTaggedSlice[],
    destino: FluxoFifoSlice[],
  ): FluxoFifoTaggedPair[] {
    const queue = origem
      .map((r) => ({
        t: new Date(r.produzidoEm).getTime(),
        rem: r.unidades,
        tag: r.tag,
      }))
      .filter((r) => !Number.isNaN(r.t) && r.rem > 0)
      .sort((a, b) => a.t - b.t);

    const destSorted = [...destino]
      .map((r) => ({
        t: new Date(r.produzidoEm).getTime(),
        un: r.unidades,
      }))
      .filter((r) => !Number.isNaN(r.t) && r.un > 0)
      .sort((a, b) => a.t - b.t);

    const pairs: FluxoFifoTaggedPair[] = [];
    let qi = 0;

    for (const d of destSorted) {
      let need = d.un;
      while (need > 0 && qi < queue.length) {
        const head = queue[qi];
        if (head.rem <= 0) {
          qi += 1;
          continue;
        }
        const take = Math.min(need, head.rem);
        pairs.push({
          un: take,
          tOrigMs: head.t,
          tDestMs: d.t,
          tag: head.tag,
        });
        head.rem -= take;
        need -= take;
        if (head.rem <= 0) qi += 1;
      }
    }

    return pairs;
  }
}
