'use client';

import { IconButton } from '@/components/ui/IconButton';
import type {
  FluxoFilaKey,
  FluxoFilaResumo,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { FluxoFilaDetalheZona, FluxoFilaEmbaladoZonas } from './FluxoFilaDetalheZona';
import {
  FluxoFilaEmbaladoCopy,
  formatAcimaDoPrazoLinha,
  formatFilaResumoQty,
} from './fluxo-fila-format';

type FluxoFilaDetalheListProps = {
  filaKey: FluxoFilaKey;
  resumo: FluxoFilaResumo;
  label: string;
  scale: FluxoDisplayScale;
  prazoMin: number;
  onClose: () => void;
};

class FluxoFilaDetalheHeaderCopy {
  static titulo(
    label: string,
    resumo: FluxoFilaResumo,
    scale: FluxoDisplayScale,
    showPrazo: boolean,
    prazoMin: number,
    filaKey: FluxoFilaKey,
  ): string {
    const total =
      filaKey === 'embalado'
        ? formatFilaResumoQty(resumo.items, scale, { origem: 'op_do_dia' })
        : formatFilaResumoQty(resumo.items, scale);
    if (!showPrazo) return `${label} — ${total}`;
    const preso = formatFilaResumoQty(resumo.items, scale, { presoOnly: true });
    return `${label} — ${total} · ${formatAcimaDoPrazoLinha(preso, prazoMin)}`;
  }

  static linhaAnterior(resumo: FluxoFilaResumo, scale: FluxoDisplayScale): string | null {
    if (resumo.anteriorUn <= 0) return null;
    const qty = formatFilaResumoQty(resumo.items, scale, { origem: 'nao_do_dia' });
    return FluxoFilaEmbaladoCopy.linhaApoio(
      qty,
      FluxoFilaEmbaladoCopy.datasOpAnteriores(resumo.items),
    );
  }
}

export default function FluxoFilaDetalheList({
  filaKey,
  resumo,
  label,
  scale,
  prazoMin,
  onClose,
}: FluxoFilaDetalheListProps) {
  const showPrazo = filaKey === 'fermentando' || filaKey === 'resfriando';
  const titulo = FluxoFilaDetalheHeaderCopy.titulo(
    label,
    resumo,
    scale,
    showPrazo,
    prazoMin,
    filaKey,
  );
  const linhaAnterior =
    filaKey === 'embalado' ? FluxoFilaDetalheHeaderCopy.linhaAnterior(resumo, scale) : null;
  const vazio = resumo.items.length === 0;
  const part =
    filaKey === 'embalado'
      ? FluxoFilaEmbaladoZonas.particionar(resumo.items)
      : { doDia: resumo.items, grupos: [] };

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <div className="mb-2 flex min-h-11 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-strong">{titulo}</p>
          {linhaAnterior ? (
            <p className="text-[12px] text-text-muted">{linhaAnterior}</p>
          ) : null}
        </div>
        <IconButton icon="close" label="Fechar lista" variant="ghost" size="lg" onClick={onClose} />
      </div>
      {vazio ? (
        <p className="py-3 text-sm text-text-muted">Nenhum item nesta fila.</p>
      ) : (
        <div>
          <FluxoFilaDetalheZona
            items={part.doDia}
            scale={scale}
            filaKey={filaKey}
            evenStart={0}
          />
          {part.grupos.map((grupo, gi) => (
            <FluxoFilaDetalheZona
              key={grupo.dataOp ?? 'sem-op'}
              heading={FluxoFilaEmbaladoCopy.headingZona(grupo.dataOp)}
              items={grupo.items}
              scale={scale}
              filaKey={filaKey}
              zonaAnterior
              evenStart={FluxoFilaEmbaladoZonas.evenStart(part.doDia.length, part.grupos, gi)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
