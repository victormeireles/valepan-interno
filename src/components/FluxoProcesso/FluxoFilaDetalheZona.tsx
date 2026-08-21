'use client';

import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import type {
  FluxoFilaItem,
  FluxoFilaKey,
  FluxoFilaPerdaOrigem,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import { formatBrazilHourMinuteLabel } from '@/lib/utils/date-utils';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { FluxoFilaEmbaladoCopy, FluxoFilaPerdasCopy, formatFilaQty, formatNaFilaBadge } from './fluxo-fila-format';

export type FluxoFilaZonaGrupo = {
  dataOp: string | null;
  items: FluxoFilaItem[];
};

export class FluxoFilaEmbaladoZonas {
  static particionar(items: FluxoFilaItem[]): {
    doDia: FluxoFilaItem[];
    grupos: FluxoFilaZonaGrupo[];
  } {
    const doDia = items.filter((i) => i.origem === 'op_do_dia');
    const grupos: FluxoFilaZonaGrupo[] = [];
    for (const item of items) {
      if (item.origem === 'op_anterior') FluxoFilaEmbaladoZonas.pushGrupo(grupos, item.dataOp, item);
    }
    const semOp = items.filter((i) => i.origem === 'sem_op');
    if (semOp.length > 0) grupos.push({ dataOp: null, items: semOp });
    return { doDia, grupos };
  }

  private static pushGrupo(
    grupos: FluxoFilaZonaGrupo[],
    dataOp: string | null,
    item: FluxoFilaItem,
  ): void {
    const last = grupos[grupos.length - 1];
    if (last && last.dataOp === dataOp) {
      last.items.push(item);
      return;
    }
    grupos.push({ dataOp, items: [item] });
  }

  static evenStart(doDiaLen: number, grupos: FluxoFilaZonaGrupo[], gi: number): number {
    let n = doDiaLen;
    for (let i = 0; i < gi; i++) n += grupos[i].items.length;
    return n;
  }
}

const PERDA_ORDEM: FluxoFilaPerdaOrigem[] = ['fermentacao', 'forno', 'embalagem'];

export type FluxoFilaPerdaZona = {
  origem: FluxoFilaPerdaOrigem;
  items: FluxoFilaItem[];
};

export class FluxoFilaPerdasZonas {
  static particionar(items: FluxoFilaItem[]): FluxoFilaPerdaZona[] {
    return PERDA_ORDEM.map((origem) => ({
      origem,
      items: items.filter((i) => i.perdaOrigem === origem),
    })).filter((zona) => zona.items.length > 0);
  }

  static evenStart(zonas: FluxoFilaPerdaZona[], gi: number): number {
    let n = 0;
    for (let i = 0; i < gi; i++) n += zonas[i].items.length;
    return n;
  }
}

function loteSubtitle(item: FluxoFilaItem): string {
  const base = item.observacao.trim() || item.assadeiraNome;
  if (!item.ultimoLoteEm) return base;
  const hora = formatBrazilHourMinuteLabel(new Date(item.ultimoLoteEm));
  return `${base} · lote ${hora}`;
}

function presoBadge(item: FluxoFilaItem, filaKey: FluxoFilaKey): string | null {
  if (filaKey === 'perdas') return FluxoFilaPerdasCopy.badge(item.perdaOrigem);
  if (!item.preso || item.naFilaMin == null) return null;
  return formatNaFilaBadge(item.naFilaMin, filaKey);
}

export function FluxoFilaDetalheRow({
  item,
  scale,
  even,
  filaKey,
  zonaAnterior,
}: {
  item: FluxoFilaItem;
  scale: FluxoDisplayScale;
  even: boolean;
  filaKey: FluxoFilaKey;
  zonaAnterior?: boolean;
}) {
  const volume = formatFilaQty(item.volumeUn, scale, item.assadeiraNome, item.produtoNome);
  const preso = presoBadge(item, filaKey);
  const badge = zonaAnterior
    ? FluxoFilaEmbaladoCopy.badge(item.dataOp)
    : preso;
  return (
    <ListRow
      even={even}
      index={item.origem === 'sem_op' ? undefined : `#${item.ordemPlanejamento}`}
      title={item.produtoNome}
      subtitle={loteSubtitle(item)}
      columns={[{ value: volume, width: '5.5rem', emphasize: !zonaAnterior }]}
      menu={
        badge ? (
          <Badge tone={zonaAnterior ? 'neutral' : filaKey === 'perdas' ? 'danger' : 'accent'}>
            {badge}
          </Badge>
        ) : undefined
      }
    />
  );
}

export function FluxoFilaDetalheZona({
  heading,
  items,
  scale,
  filaKey,
  zonaAnterior,
  evenStart,
}: {
  heading?: string;
  items: FluxoFilaItem[];
  scale: FluxoDisplayScale;
  filaKey: FluxoFilaKey;
  zonaAnterior?: boolean;
  evenStart: number;
}) {
  return (
    <div>
      {heading ? (
        <p className="mb-1.5 mt-3 text-[11px] font-medium text-text-muted">{heading}</p>
      ) : null}
      {items.map((item, i) => (
        <FluxoFilaDetalheRow
          key={`${item.ordemProducaoId}-${item.ultimoLoteEm ?? 'plano'}-${item.dataOp ?? 'dia'}-${i}`}
          item={item}
          scale={scale}
          even={(evenStart + i) % 2 === 1}
          filaKey={filaKey}
          zonaAnterior={zonaAnterior}
        />
      ))}
    </div>
  );
}
