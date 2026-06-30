'use client';

import { useState } from 'react';
import type { InsumoPendenciaNfsTarget } from '@/domain/insumos/insumo-pendencia-nfs-target';
import InsumoPendenciaNfsModal from '@/features/insumo-estoque/components/InsumoPendenciaNfsModal';

type Props = {
  target: InsumoPendenciaNfsTarget;
  disabled?: boolean;
};

export default function InsumoPendenciaNfsButton({ target, disabled = false }: Props) {
  const [open, setOpen] = useState(false);

  const label =
    target.nfsDistintas === 1
      ? 'Ver 1 nota fiscal'
      : `Ver ${target.nfsDistintas} notas fiscais`;

  return (
    <>
      <button
        type="button"
        disabled={disabled || target.nfsDistintas === 0}
        aria-label={label}
        onClick={() => setOpen(true)}
        className={[
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5',
          'font-mono text-sm tabular-nums transition-colors duration-150',
          disabled || target.nfsDistintas === 0
            ? 'cursor-not-allowed text-stone-300'
            : 'text-stone-700 hover:bg-amber-50 hover:text-amber-900',
        ].join(' ')}
      >
        <span className="material-icons text-base" aria-hidden="true">
          receipt_long
        </span>
        {target.nfsDistintas}
      </button>

      <InsumoPendenciaNfsModal
        isOpen={open}
        target={open ? target : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
