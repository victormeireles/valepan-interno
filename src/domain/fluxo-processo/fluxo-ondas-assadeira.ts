import { getBrazilHourFromIso } from '@/lib/utils/date-utils';

import { FluxoFifoMatcher } from './fluxo-fifo-matcher';
import type {
  FluxoOndaAssadeira,
  FluxoOndaProduto,
  FluxoOndaSegmento,
} from './fluxo-processo-types';

export type FluxoOndaEvento = {
  produzidoEm: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  /** YYYY-MM-DD da OP; vazio = sem OP. */
  dataOp: string;
  opAnterior: boolean;
};

type HourBlock = { ini: number; fim: number };

type OndaAcc = {
  opKey: string;
  opLabel: string;
  blockIni: number;
  blockFim: number;
  /** Volume fermentado no bloco (o que o gráfico mostra). */
  volumeFermUn: number;
  fornoHourUn: Map<number, number>;
  embHourUn: Map<number, number>;
  lagsFermForno: { lagMin: number; un: number; destHora: number }[];
  lagsFornoEmb: { lagMin: number; un: number; destHora: number }[];
  produtosFerm: Map<string, number>;
  embOpAnteriorUn: number;
};

/**
 * Ondas do fluxo por assadeira: FIFO por (OP + produto),
 * agrupadas em blocos contínuos de fermentação.
 *
 * Volume da onda = fermentado no bloco (não só o casado).
 * Janelas de forno/emb = horas até cobrir ~98% do volume casado
 * (evita “rabo” FIFO esticar 04–11 quando o miolo é 04–06).
 */
export class FluxoOndasAssadeiraCalculator {
  private readonly fifo = new FluxoFifoMatcher();

  computeForAssadeira(
    assadeira: string,
    ferm: FluxoOndaEvento[],
    forno: FluxoOndaEvento[],
    emb: FluxoOndaEvento[],
  ): FluxoOndaAssadeira[] {
    const f = ferm.filter((e) => e.assadeiraNome === assadeira && e.unidades > 0);
    const o = forno.filter((e) => e.assadeiraNome === assadeira && e.unidades > 0);
    const em = emb.filter((e) => e.assadeiraNome === assadeira && e.unidades > 0);

    const opKeys = new Set<string>();
    for (const row of [...f, ...o, ...em]) opKeys.add(opKeyOf(row.dataOp));

    const ondas: FluxoOndaAssadeira[] = [];
    let seq = 0;

    for (const opKey of [...opKeys].sort()) {
      const fermOp = f.filter((r) => opKeyOf(r.dataOp) === opKey);
      const fornoOp = o.filter((r) => opKeyOf(r.dataOp) === opKey);
      const embOp = em.filter((r) => opKeyOf(r.dataOp) === opKey);
      if (fermOp.length === 0) continue;

      const blocks = contiguousHourBlocks(fermOp);
      if (blocks.length === 0) continue;

      const accs = blocks.map((b) => {
        const acc = emptyAcc(opKey, opLabelOf(opKey), b);
        for (const row of fermOp) {
          const h = getBrazilHourFromIso(row.produzidoEm);
          if (h == null || h < b.ini || h > b.fim) continue;
          acc.volumeFermUn += row.unidades;
          acc.produtosFerm.set(
            row.produtoNome,
            (acc.produtosFerm.get(row.produtoNome) ?? 0) + row.unidades,
          );
        }
        return acc;
      });

      const produtos = new Set<string>();
      for (const row of [...fermOp, ...fornoOp, ...embOp]) produtos.add(row.produtoNome);

      for (const produto of produtos) {
        const fermP = fermOp.filter((r) => r.produtoNome === produto);
        const fornoP = fornoOp.filter((r) => r.produtoNome === produto);
        const embP = embOp.filter((r) => r.produtoNome === produto);

        const ff = this.fifo.match(fermP, fornoP);

        const fornoTagged = ff
          .map((pair) => {
            const hOrig = hourFromMs(pair.tOrigMs);
            const blockIdx = blocks.findIndex((b) => hOrig >= b.ini && hOrig <= b.fim);
            if (blockIdx < 0) return null;
            const acc = accs[blockIdx];
            const destH = hourFromMs(pair.tDestMs);
            acc.fornoHourUn.set(destH, (acc.fornoHourUn.get(destH) ?? 0) + pair.un);
            acc.lagsFermForno.push({
              lagMin: (pair.tDestMs - pair.tOrigMs) / 60_000,
              un: pair.un,
              destHora: destH,
            });
            return {
              produzidoEm: new Date(pair.tDestMs).toISOString(),
              unidades: pair.un,
              tag: blockIdx,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null);

        const fe = this.fifo.matchTagged(fornoTagged, embP);
        for (const pair of fe) {
          const acc = accs[pair.tag];
          if (!acc) continue;
          const destH = hourFromMs(pair.tDestMs);
          acc.embHourUn.set(destH, (acc.embHourUn.get(destH) ?? 0) + pair.un);
          acc.lagsFornoEmb.push({
            lagMin: (pair.tDestMs - pair.tOrigMs) / 60_000,
            un: pair.un,
            destHora: destH,
          });
          acc.embOpAnteriorUn += embAnteriorUnAt(embP, pair.tDestMs, pair.un);
        }
      }

      for (const acc of accs) {
        if (acc.volumeFermUn <= 0) continue;
        seq += 1;
        ondas.push(toOnda(acc, seq));
      }
    }

    return ondas.sort(
      (a, b) => a.fermIniHora - b.fermIniHora || a.opKey.localeCompare(b.opKey),
    );
  }
}

function emptyAcc(opKey: string, opLabel: string, block: HourBlock): OndaAcc {
  return {
    opKey,
    opLabel,
    blockIni: block.ini,
    blockFim: block.fim,
    volumeFermUn: 0,
    fornoHourUn: new Map(),
    embHourUn: new Map(),
    lagsFermForno: [],
    lagsFornoEmb: [],
    produtosFerm: new Map(),
    embOpAnteriorUn: 0,
  };
}

function toOnda(acc: OndaAcc, seq: number): FluxoOndaAssadeira {
  const fornoWin = hourWindowCovering(acc.fornoHourUn);
  const embWin = hourWindowCovering(acc.embHourUn);
  const fornoSegmentos = hourSegmentsInWindow(acc.fornoHourUn, fornoWin);
  const embSegmentos = hourSegmentsInWindow(acc.embHourUn, embWin);

  const lagsFF = fornoWin
    ? acc.lagsFermForno.filter(
        (l) => l.destHora >= fornoWin.ini && l.destHora <= fornoWin.fim,
      )
    : [];
  const lagsFE = embWin
    ? acc.lagsFornoEmb.filter((l) => l.destHora >= embWin.ini && l.destHora <= embWin.fim)
    : [];

  const produtos: FluxoOndaProduto[] = [...acc.produtosFerm.entries()]
    .map(([nome, un]) => ({ nome, un: Math.round(un) }))
    .sort((a, b) => b.un - a.un);

  return {
    id: `${acc.opKey}-${acc.blockIni}-${seq}`,
    opKey: acc.opKey,
    opLabel: acc.opLabel,
    volumeUn: Math.round(acc.volumeFermUn),
    volumeFornoUn: Math.round(sumSegments(fornoSegmentos)),
    volumeEmbUn: Math.round(sumSegments(embSegmentos)),
    fermIniHora: acc.blockIni,
    fermFimHora: acc.blockFim,
    fornoIniHora: fornoSegmentos[0]?.ini ?? null,
    fornoFimHora: fornoSegmentos.at(-1)?.fim ?? null,
    embIniHora: embSegmentos[0]?.ini ?? null,
    embFimHora: embSegmentos.at(-1)?.fim ?? null,
    fornoSegmentos,
    embSegmentos,
    lagFermFornoMedMin: weightedMedian(lagsFF),
    lagFornoEmbMedMin: weightedMedian(lagsFE),
    embOpAnterior: acc.embOpAnteriorUn > 0,
    produtos,
  };
}

function sumSegments(segs: FluxoOndaSegmento[]): number {
  return segs.reduce((t, s) => t + s.volumeUn, 0);
}

/**
 * Blocos contínuos de horas com volume, dentro da janela coberta.
 * Gap (ex.: 07–08 sem emb) vira espaço vazio entre segmentos na UI.
 */
function hourSegmentsInWindow(
  hourUn: Map<number, number>,
  win: { ini: number; fim: number } | null,
): FluxoOndaSegmento[] {
  if (!win) return [];
  const hours = [...hourUn.keys()]
    .filter((h) => h >= win.ini && h <= win.fim && (hourUn.get(h) ?? 0) > 0)
    .sort((a, b) => a - b);
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

/**
 * Janela horária do miolo do volume casado.
 * Avança hora a hora; se há buraco e já cobrimos ≥90%, para
 * (corta rabo FIFO tipo 04–06 + resto às 11). Pausas cedo (emb 06→09)
 * entram na janela; a UI quebra em segmentos contínuos.
 */
function hourWindowCovering(
  hourUn: Map<number, number>,
): { ini: number; fim: number } | null {
  if (hourUn.size === 0) return null;
  const hours = [...hourUn.keys()].sort((a, b) => a - b);
  const total = [...hourUn.values()].reduce((t, v) => t + v, 0);
  if (total <= 0) return null;

  let acc = 0;
  const ini = hours[0];
  let fim = hours[0];

  for (let i = 0; i < hours.length; i++) {
    const h = hours[i];
    acc += hourUn.get(h) ?? 0;
    fim = h;

    if (acc / total >= 0.98) break;

    const next = hours[i + 1];
    if (next == null) break;
    const gap = next - h;
    if (gap > 1 && acc / total >= 0.9) break;
  }

  return { ini, fim };
}

function embAnteriorUnAt(
  embP: FluxoOndaEvento[],
  tDestMs: number,
  takeUn: number,
): number {
  let remaining = takeUn;
  let ant = 0;
  const atTime = embP
    .filter((r) => new Date(r.produzidoEm).getTime() === tDestMs)
    .sort((a, b) => Number(b.opAnterior) - Number(a.opAnterior));
  for (const row of atTime) {
    if (remaining <= 0) break;
    const use = Math.min(remaining, row.unidades);
    if (row.opAnterior) ant += use;
    remaining -= use;
  }
  return ant;
}

function opKeyOf(dataOp: string): string {
  return dataOp.trim() || 'sem-op';
}

function opLabelOf(opKey: string): string {
  if (opKey === 'sem-op') return 'sem OP';
  const m = opKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return opKey;
  return `${m[3]}/${m[2]}`;
}

function contiguousHourBlocks(events: FluxoOndaEvento[]): HourBlock[] {
  const hours = new Set<number>();
  for (const e of events) {
    const h = getBrazilHourFromIso(e.produzidoEm);
    if (h != null && h >= 0 && h <= 23) hours.add(h);
  }
  const sorted = [...hours].sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const blocks: HourBlock[] = [];
  let ini = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    blocks.push({ ini, fim: prev });
    ini = sorted[i];
    prev = sorted[i];
  }
  blocks.push({ ini, fim: prev });
  return blocks;
}

function hourFromMs(ms: number): number {
  return getBrazilHourFromIso(new Date(ms).toISOString()) ?? 0;
}

function weightedMedian(
  pairs: { lagMin: number; un: number }[],
): number | null {
  if (pairs.length === 0) return null;
  const sorted = [...pairs].sort((a, b) => a.lagMin - b.lagMin);
  const total = sorted.reduce((t, x) => t + x.un, 0);
  if (total <= 0) return null;
  const target = total * 0.5;
  let acc = 0;
  for (const row of sorted) {
    acc += row.un;
    if (acc >= target) return Math.round(row.lagMin);
  }
  return Math.round(sorted[sorted.length - 1].lagMin);
}
