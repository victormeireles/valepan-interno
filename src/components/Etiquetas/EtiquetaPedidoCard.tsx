'use client';

import type { EtiquetaFilaItem } from '@/domain/etiquetas/etiqueta-fila-types';
import { buildEtiquetaQuantidadeHint } from '@/domain/etiquetas/etiqueta-quantidade-hint';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import {
  formatEtiquetaMeta,
  formatEtiquetaRealizado,
} from '@/components/Etiquetas/format-etiqueta-quantidade';

type EtiquetaPedidoCardProps = {
  item: EtiquetaFilaItem;
  variant: 'pendente' | 'gerado';
  onAction: (item: EtiquetaFilaItem) => void;
};

const cardBaseClass =
  'bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3';

const primaryButtonClass =
  'min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 w-full';

export default function EtiquetaPedidoCard({
  item,
  variant,
  onAction,
}: EtiquetaPedidoCardProps) {
  const hint = buildEtiquetaQuantidadeHint(item.unidade, item.produzido);
  const geradoLabel =
    variant === 'gerado' && item.geradoEm
      ? formatLocalTimeHHmm(item.geradoEm)
      : null;

  return (
    <article
      className={`${cardBaseClass} ${
        variant === 'pendente'
          ? 'hover:border-gray-300 hover:shadow-md transition-shadow duration-200'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{item.produto}</h3>
          <p className="text-sm text-gray-600 truncate">{item.tipoEstoque}</p>
        </div>
        {item.lote != null && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Lote {item.lote}
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">Meta</span>
          <span className="text-gray-900 font-medium">{formatEtiquetaMeta(item.pedido)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">Realizado</span>
          <span className="text-gray-900 font-medium">
            {formatEtiquetaRealizado(item.produzido)}
          </span>
        </div>
        {hint && <p className="text-sm text-gray-500">{hint}</p>}
      </div>

      {item.primeiroLoteHorario && (
        <p className="text-xs text-gray-500">
          Embalado às {item.primeiroLoteHorario}
        </p>
      )}

      {geradoLabel && (
        <span className="inline-flex w-fit items-center text-xs text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">
          Gerado às {geradoLabel}
        </span>
      )}

      <button
        type="button"
        onClick={() => onAction(item)}
        className={primaryButtonClass}
      >
        <span className="material-icons text-base" aria-hidden>
          {variant === 'pendente' ? 'print' : 'replay'}
        </span>
        {variant === 'pendente' ? 'Gerar etiqueta' : 'Reimprimir'}
      </button>
    </article>
  );
}
