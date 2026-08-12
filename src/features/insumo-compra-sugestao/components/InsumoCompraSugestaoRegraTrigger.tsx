'use client';

import type { ReactNode } from 'react';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';

type Props = {
  item: InsumoCompraSugestaoLinha;
  onCadastrarRegra: (item: InsumoCompraSugestaoLinha) => void;
  children: ReactNode;
  className?: string;
};

export default function InsumoCompraSugestaoRegraTrigger({
  item,
  onCadastrarRegra,
  children,
  className = '',
}: Props) {
  if (item.status !== 'sem_regra') {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onCadastrarRegra(item)}
      aria-label={`Cadastrar regra de ${item.nome}`}
      className={[
        'inline-flex min-h-11 w-full items-start gap-1.5 rounded-xl text-left',
        'transition-colors duration-150 hover:bg-amber-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        className,
      ].join(' ')}
    >
      <span className="material-icons mt-0.5 text-base text-amber-700" aria-hidden="true">
        rule
      </span>
      <span className="min-w-0 flex-1 text-amber-900">{children}</span>
    </button>
  );
}
