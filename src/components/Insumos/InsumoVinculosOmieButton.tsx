'use client';

import { useState } from 'react';
import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import InsumoVinculosOmieModal from '@/components/Insumos/InsumoVinculosOmieModal';

type Props = {
  insumoNome: string;
  vinculos: IntegracaoInsumoComEmpresa[];
};

export default function InsumoVinculosOmieButton({ insumoNome, vinculos }: Props) {
  const [open, setOpen] = useState(false);
  const count = vinculos.length;

  const label =
    count === 0
      ? 'Nenhum produto Omie vinculado'
      : count === 1
        ? 'Ver 1 produto Omie vinculado'
        : `Ver ${count} produtos Omie vinculados`;

  return (
    <>
      <button
        type="button"
        disabled={count === 0}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={[
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5',
          'font-mono text-sm tabular-nums transition-colors duration-150',
          count === 0
            ? 'cursor-default text-stone-300'
            : 'text-stone-700 hover:bg-amber-50 hover:text-amber-900',
        ].join(' ')}
      >
        <span className="material-icons text-base" aria-hidden="true">
          link
        </span>
        {count}
      </button>

      <InsumoVinculosOmieModal
        isOpen={open}
        insumoNome={insumoNome}
        vinculos={vinculos}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
