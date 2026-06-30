'use client';

import { useState } from 'react';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import InsumoReceitasModal from '@/components/Insumos/InsumoReceitasModal';

type Props = {
  insumoNome: string;
  receitas: InsumoReceitaAssociacao[];
};

export default function InsumoReceitasButton({ insumoNome, receitas }: Props) {
  const [open, setOpen] = useState(false);
  const count = receitas.length;

  const label =
    count === 0
      ? 'Nenhuma receita associada'
      : count === 1
        ? 'Ver 1 receita associada'
        : `Ver ${count} receitas associadas`;

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
          menu_book
        </span>
        {count}
      </button>

      <InsumoReceitasModal
        isOpen={open}
        insumoNome={insumoNome}
        receitas={receitas}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
