'use client';

import { useState } from 'react';

import InsumoRegraCompraFormModal from '@/features/insumo-compra-sugestao/components/InsumoRegraCompraFormModal';
import type { InsumoCompraRegraConfig } from '@/lib/services/insumo-compra-regra-manager';

type Props = {
  config: InsumoCompraRegraConfig;
  onSaved: () => void;
};

function leadTimeLabel(config: InsumoCompraRegraConfig): string {
  const lead = config.regra?.lead_time_dias;
  if (lead == null) return '—';
  return `${lead}d`;
}

export default function InsumoRegraCompraButton({ config, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const temRegra = config.regra != null;
  const lead = leadTimeLabel(config);
  const label = temRegra
    ? `Ver ou editar regra de compra (${lead})`
    : 'Cadastrar regra de compra';

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={[
          'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5',
          'font-mono text-sm tabular-nums transition-colors duration-150',
          temRegra
            ? 'text-stone-700 hover:bg-amber-50 hover:text-amber-900'
            : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700',
        ].join(' ')}
      >
        <span className="material-icons text-base" aria-hidden="true">
          shopping_cart
        </span>
        <span>{lead}</span>
      </button>

      <InsumoRegraCompraFormModal
        open={open}
        regra={config}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          onSaved();
        }}
      />
    </>
  );
}
