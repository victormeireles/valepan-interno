'use client';

import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import type {
  FluxoFilaItem,
  FluxoFilaKey,
  FluxoFilaResumo,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { formatFilaQty, formatPresoDuracao } from './fluxo-fila-format';

type FluxoFilaDetalheListProps = {
  filaKey: FluxoFilaKey;
  resumo: FluxoFilaResumo;
  label: string;
  scale: FluxoDisplayScale;
  onClose: () => void;
};

class FluxoFilaDetalheHeaderCopy {
  static build(
    label: string,
    resumo: FluxoFilaResumo,
    scale: FluxoDisplayScale,
    showPrazo: boolean,
  ): string {
    const total = formatFilaQty(resumo.totalUn, scale, '', '');
    if (!showPrazo) return `${label} — ${total}`;
    const preso = formatFilaQty(resumo.presoUn, scale, '', '');
    return `${label} — ${total} · ${preso} acima do prazo`;
  }
}

function presoBadge(item: FluxoFilaItem): string | null {
  if (!item.preso || item.presoMin == null) return null;
  return `preso há ${formatPresoDuracao(item.presoMin)}`;
}

function FluxoFilaDetalheRow({
  item,
  scale,
  even,
}: {
  item: FluxoFilaItem;
  scale: FluxoDisplayScale;
  even: boolean;
}) {
  const volume = formatFilaQty(item.volumeUn, scale, item.assadeiraNome, item.produtoNome);
  const preso = presoBadge(item);
  return (
    <ListRow
      even={even}
      index={`#${item.ordemPlanejamento}`}
      title={item.produtoNome}
      subtitle={item.assadeiraNome}
      columns={[{ value: volume, width: '5.5rem', emphasize: true }]}
      menu={preso ? <Badge tone="accent">{preso}</Badge> : undefined}
    />
  );
}

export default function FluxoFilaDetalheList({
  filaKey,
  resumo,
  label,
  scale,
  onClose,
}: FluxoFilaDetalheListProps) {
  const showPrazo = filaKey !== 'aProduzir';
  const header = FluxoFilaDetalheHeaderCopy.build(label, resumo, scale, showPrazo);
  const vazio = resumo.items.length === 0;

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <div className="mb-2 flex min-h-11 items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-text-strong">{header}</p>
        <IconButton icon="close" label="Fechar lista" variant="ghost" size="lg" onClick={onClose} />
      </div>
      {vazio ? (
        <p className="py-3 text-sm text-text-muted">Nenhuma OP nesta fila.</p>
      ) : (
        <div>
          {resumo.items.map((item, i) => (
            <FluxoFilaDetalheRow
              key={item.ordemProducaoId}
              item={item}
              scale={scale}
              even={i % 2 === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
