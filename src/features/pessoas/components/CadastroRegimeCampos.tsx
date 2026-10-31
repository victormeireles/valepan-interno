'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Regime } from '@/domain/pessoas/regime-cadastro';

export function CadastroRegimeCampos({
  regimeInicial,
  cnpj,
  razaoSocial,
}: {
  regimeInicial: Regime;
  cnpj: string | null;
  razaoSocial: string | null;
}) {
  const [regime, setRegime] = useState<Regime>(regimeInicial);
  return (
    <>
      <Select
        name="regime"
        label="Regime"
        value={regime}
        onChange={(evento) => setRegime(evento.target.value === 'pj' ? 'pj' : 'clt')}
        options={[
          { value: 'clt', label: 'CLT' },
          { value: 'pj', label: 'PJ' },
        ]}
      />
      {regime === 'pj' ? (
        <>
          <Input name="cnpj" label="CNPJ" defaultValue={cnpj ?? ''} inputMode="numeric" />
          <div className="sm:col-span-2">
            <Input name="razaoSocial" label="Razão social" defaultValue={razaoSocial ?? ''} />
          </div>
        </>
      ) : null}
    </>
  );
}
