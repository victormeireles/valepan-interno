import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';

/** Campos mínimos para agrupar e agregar (alinha a `PainelItem` / `RealizadoItemEmbalagem`). */
export type EmbalagemGroupRow = {
  produto: string;
  produzido: number;
  aProduzir: number;
  unidade: string;
  congelado: 'Sim' | 'Não';
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  producaoUpdatedAt?: string;
  rowId?: number;
};

export type EmbalagemProdutoGroup = {
  produto: string;
  lots: EmbalagemGroupRow[];
  somaProduzido: number;
  somaAProduzir: number;
  /** `true` se qualquer lote tiver `congelado === 'Sim'`. */
  algumCongelado: boolean;
  somaCaixas: number;
  somaPacotes: number;
  somaUnidades: number;
  somaKg: number;
  somaPedidoCaixas: number;
  somaPedidoPacotes: number;
  somaPedidoUnidades: number;
  somaPedidoKg: number;
  /** Horário HH:mm do `producaoUpdatedAt` mais recente entre lotes com quantidade embalada. */
  horarioMaisRecente?: string;
};

export function hasEmbalagemQuantity(item: Pick<EmbalagemGroupRow, 'caixas' | 'pacotes' | 'unidades' | 'kg'>): boolean {
  return (
    (item.caixas ?? 0) > 0 ||
    (item.pacotes ?? 0) > 0 ||
    (item.unidades ?? 0) > 0 ||
    (item.kg ?? 0) > 0
  );
}

function parseTimeMs(iso: string): number | null {
  const t = Date.parse(iso.trim());
  return Number.isNaN(t) ? null : t;
}

/** Entre lotes com quantidade embalada e timestamp válido, devolve HH:mm do mais recente. */
export function latestEmbalagemHorarioHHmm(lots: EmbalagemGroupRow[]): string | undefined {
  let bestMs: number | null = null;
  let bestRaw: string | null = null;
  for (const lot of lots) {
    if (!hasEmbalagemQuantity(lot)) continue;
    const raw = lot.producaoUpdatedAt?.trim();
    if (!raw) continue;
    const ms = parseTimeMs(raw);
    if (ms === null) continue;
    if (bestMs === null || ms > bestMs) {
      bestMs = ms;
      bestRaw = raw;
    }
  }
  if (!bestRaw) return undefined;
  return formatLocalTimeHHmm(bestRaw) ?? undefined;
}

function aggregateLots(lots: EmbalagemGroupRow[]): Omit<EmbalagemProdutoGroup, 'produto' | 'lots'> {
  let somaProduzido = 0;
  let somaAProduzir = 0;
  let somaCaixas = 0;
  let somaPacotes = 0;
  let somaUnidades = 0;
  let somaKg = 0;
  let somaPedidoCaixas = 0;
  let somaPedidoPacotes = 0;
  let somaPedidoUnidades = 0;
  let somaPedidoKg = 0;
  let algumCongelado = false;

  for (const lot of lots) {
    somaProduzido += lot.produzido;
    somaAProduzir += lot.aProduzir;
    somaCaixas += lot.caixas ?? 0;
    somaPacotes += lot.pacotes ?? 0;
    somaUnidades += lot.unidades ?? 0;
    somaKg += lot.kg ?? 0;
    somaPedidoCaixas += lot.pedidoCaixas ?? 0;
    somaPedidoPacotes += lot.pedidoPacotes ?? 0;
    somaPedidoUnidades += lot.pedidoUnidades ?? 0;
    somaPedidoKg += lot.pedidoKg ?? 0;
    if (lot.congelado === 'Sim') algumCongelado = true;
  }

  return {
    somaProduzido,
    somaAProduzir,
    algumCongelado,
    somaCaixas,
    somaPacotes,
    somaUnidades,
    somaKg,
    somaPedidoCaixas,
    somaPedidoPacotes,
    somaPedidoUnidades,
    somaPedidoKg,
    horarioMaisRecente: latestEmbalagemHorarioHHmm(lots),
  };
}

/**
 * Agrupa por `produto` preservando a ordem de primeira aparição do produto na lista de entrada
 * (que já deve estar ordenada por `rowId` na página).
 */
export function groupEmbalagemItemsByProduto(items: EmbalagemGroupRow[]): EmbalagemProdutoGroup[] {
  const order: string[] = [];
  const byProduto = new Map<string, EmbalagemGroupRow[]>();

  for (const item of items) {
    const p = item.produto;
    if (!byProduto.has(p)) {
      byProduto.set(p, []);
      order.push(p);
    }
    byProduto.get(p)!.push(item);
  }

  return order.map((produto) => {
    const lots = byProduto.get(produto)!;
    return { produto, lots, ...aggregateLots(lots) };
  });
}
