'use client';

import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';
import { formatInsumoQuantidadeArredondada } from '@/features/insumo-estoque/utils/formatters';

type Props = {
  item: InsumoCompraSugestaoLinha;
  onAjustar: (item: InsumoCompraSugestaoLinha) => void;
  className?: string;
};

export default function InsumoCompraSugestaoEstoqueButton({
  item,
  onAjustar,
  className = '',
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onAjustar(item)}
      aria-label={`Ajustar saldo de ${item.nome}`}
      className={[
        'inline-flex min-h-11 items-center justify-end gap-1 rounded-xl px-2',
        'font-mono text-sm tabular-nums text-stone-700',
        'transition-colors duration-150 hover:bg-amber-50 hover:text-amber-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        className,
      ].join(' ')}
    >
      <span>{formatInsumoQuantidadeArredondada(item.estoque, item.unidade)}</span>
      <span className="material-icons text-base text-stone-400" aria-hidden="true">
        tune
      </span>
    </button>
  );
}
