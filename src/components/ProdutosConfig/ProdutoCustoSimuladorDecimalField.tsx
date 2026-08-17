'use client';

import { useEffect, useState } from 'react';
import { produtoCustoSimuladorDecimalDraft } from '@/components/ProdutosConfig/produto-custo-simulador-decimal-draft';

type Props = {
  id: string;
  className: string;
  placeholder: string;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
};

export default function ProdutoCustoSimuladorDecimalField({
  id,
  className,
  placeholder,
  value,
  onValueChange,
}: Props) {
  const [draft, setDraft] = useState(() =>
    produtoCustoSimuladorDecimalDraft.formatCommitted(value),
  );

  useEffect(() => {
    setDraft((current) =>
      produtoCustoSimuladorDecimalDraft.draftForParent(current, value),
    );
  }, [value]);

  return (
    <input
      id={id}
      className={className}
      inputMode="decimal"
      placeholder={placeholder}
      value={draft}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const result = produtoCustoSimuladorDecimalDraft.commit(raw);
        if (result.shouldCommit) onValueChange(result.value);
      }}
    />
  );
}
