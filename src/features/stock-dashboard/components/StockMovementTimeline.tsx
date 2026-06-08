'use client';

import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import {
  formatDeltaLines,
  isDeltaEntrada,
  ORIGEM_BORDER_COLORS,
  ORIGEM_COLORS,
  ORIGEM_DELTA_TEXT_COLORS,
  ORIGEM_LABELS,
} from '@/domain/estoque/movimento-display';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

export type StockMovementTimelineProps = {
  movimentos: EstoqueMovimentoRecord[];
  showDateOnTime?: boolean;
};

function formatMovementTime(iso: string, showDate: boolean): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!showDate) return time;
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} · ${time}`;
}

export function StockMovementTimeline({
  movimentos,
  showDateOnTime = false,
}: StockMovementTimelineProps) {
  return (
    <ol className="space-y-2" aria-label="Linha do tempo de movimentos">
      {movimentos.map((mov) => {
        const deltaLines = formatDeltaLines(mov.delta);
        const entrada = isDeltaEntrada(mov.delta);
        const borderColor = ORIGEM_BORDER_COLORS[mov.origem];
        const deltaTextColor = ORIGEM_DELTA_TEXT_COLORS[mov.origem];

        return (
          <li
            key={mov.id}
            className={`rounded-r-xl border border-gray-100 border-l-4 bg-white py-2.5 pl-3 pr-3 shadow-sm ${borderColor}`}
          >
            <div className="flex items-start justify-between gap-2">
              <time
                className="text-sm font-semibold tabular-nums text-gray-900 shrink-0"
                dateTime={mov.createdAt}
              >
                {formatMovementTime(mov.createdAt, showDateOnTime)}
              </time>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${ORIGEM_COLORS[mov.origem]}`}
              >
                {ORIGEM_LABELS[mov.origem]}
              </span>
            </div>

            {deltaLines.length > 0 ? (
              <p
                className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular-nums ${deltaTextColor}`}
              >
                {entrada ? (
                  <DeltaUpIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <DeltaDownIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {deltaLines.map((line, i) => (
                  <span key={line.field}>
                    {i > 0 && (
                      <span className="font-normal text-gray-400"> · </span>
                    )}
                    <span className="font-bold">{line.signed}</span>{' '}
                    <span className="text-xs font-medium text-gray-500">
                      {line.field}
                    </span>
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-gray-500">
                Sem alteração de quantidade
              </p>
            )}

            {mov.origem === 'saida' && mov.clienteDestino ? (
              <p className="mt-1 text-xs text-gray-500">
                Para{' '}
                <span className="font-semibold text-gray-700">
                  {mov.clienteDestino}
                </span>
              </p>
            ) : null}

            <p className="mt-1 text-xs text-gray-500">
              Saldo após{' '}
              <span className="font-semibold tabular-nums text-gray-800">
                {formatQuantidade(mov.saldo)}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function DeltaUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function DeltaDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
