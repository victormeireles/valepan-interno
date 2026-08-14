import type {
  FluxoEtapaKey,
  FluxoOndaAssadeira,
  FluxoOndaSegmento,
} from './fluxo-processo-types';

/**
 * Horas da matriz da assadeira que não pertencem a nenhuma onda.
 * Aparecem como cinza suave no gráfico único (linha ocupada, outra produção).
 */
export class FluxoOndasContextoBuilder {
  build(
    etapa: FluxoEtapaKey,
    matrizHoras: number[],
    ondas: FluxoOndaAssadeira[],
  ): FluxoOndaSegmento[] {
    const covered = coveredHours(etapa, ondas);
    const hourUn = new Map<number, number>();

    for (let h = 0; h < 24; h++) {
      const un = matrizHoras[h] ?? 0;
      if (un <= 0 || covered.has(h)) continue;
      hourUn.set(h, un);
    }

    return contiguousFromHourMap(hourUn);
  }
}

/**
 * Parte um segmento em trechos contínuos dia vs OP anterior
 * (matrizAnt[h] > 0 → hachurado na UI).
 */
export class FluxoOndaSegmentoOpAnteriorSplitter {
  split(
    seg: FluxoOndaSegmento,
    antHoras: number[],
  ): { segmento: FluxoOndaSegmento; opAnterior: boolean }[] {
    const span = seg.fim - seg.ini + 1;
    if (span <= 0) return [];

    const hours: { h: number; ant: boolean }[] = [];
    for (let h = seg.ini; h <= seg.fim; h++) {
      hours.push({ h, ant: (antHoras[h] ?? 0) > 0 });
    }

    const unPorHora = seg.volumeUn / span;
    const out: { segmento: FluxoOndaSegmento; opAnterior: boolean }[] = [];
    let ini = hours[0].h;
    let prev = hours[0].h;
    let ant = hours[0].ant;
    let vol = unPorHora;

    for (let i = 1; i < hours.length; i++) {
      const row = hours[i];
      if (row.ant === ant && row.h === prev + 1) {
        prev = row.h;
        vol += unPorHora;
        continue;
      }
      out.push({
        segmento: { ini, fim: prev, volumeUn: Math.round(vol) },
        opAnterior: ant,
      });
      ini = row.h;
      prev = row.h;
      ant = row.ant;
      vol = unPorHora;
    }
    out.push({
      segmento: { ini, fim: prev, volumeUn: Math.round(vol) },
      opAnterior: ant,
    });
    return out;
  }
}

function coveredHours(
  etapa: FluxoEtapaKey,
  ondas: FluxoOndaAssadeira[],
): Set<number> {
  const set = new Set<number>();
  for (const onda of ondas) {
    const segs = segmentosDaEtapa(etapa, onda);
    for (const s of segs) {
      for (let h = s.ini; h <= s.fim; h++) set.add(h);
    }
  }
  return set;
}

function segmentosDaEtapa(
  etapa: FluxoEtapaKey,
  onda: FluxoOndaAssadeira,
): FluxoOndaSegmento[] {
  if (etapa === 'ferm') {
    return [
      {
        ini: onda.fermIniHora,
        fim: onda.fermFimHora,
        volumeUn: onda.volumeUn,
      },
    ];
  }
  if (etapa === 'forno') return onda.fornoSegmentos;
  return onda.embSegmentos;
}

function contiguousFromHourMap(hourUn: Map<number, number>): FluxoOndaSegmento[] {
  const hours = [...hourUn.keys()].sort((a, b) => a - b);
  if (hours.length === 0) return [];

  const segs: FluxoOndaSegmento[] = [];
  let ini = hours[0];
  let prev = hours[0];
  let vol = hourUn.get(hours[0]) ?? 0;

  for (let i = 1; i < hours.length; i++) {
    const h = hours[i];
    if (h === prev + 1) {
      prev = h;
      vol += hourUn.get(h) ?? 0;
      continue;
    }
    segs.push({ ini, fim: prev, volumeUn: Math.round(vol) });
    ini = h;
    prev = h;
    vol = hourUn.get(h) ?? 0;
  }
  segs.push({ ini, fim: prev, volumeUn: Math.round(vol) });
  return segs;
}

/** Id da onda a selecionar por padrão (maior volume Ferm). */
export class FluxoOndaSelecaoDefault {
  static id(ondas: FluxoOndaAssadeira[]): string | null {
    if (ondas.length === 0) return null;
    let best = ondas[0];
    for (const o of ondas) {
      if (o.volumeUn > best.volumeUn) best = o;
    }
    return best.id;
  }
}
