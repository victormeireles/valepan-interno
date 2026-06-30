import { Suspense } from 'react';
import { getInsumos, getReceitasAssociadasPorInsumos, getVinculosOmieAssociadosPorInsumos } from '@/app/actions/insumos-actions';
import InsumosConfigClient from './InsumosConfigClient';

export const dynamic = 'force-dynamic';

export default async function InsumosConfigPage() {
  const [insumos, receitasPorInsumo, vinculosOmiePorInsumo] = await Promise.all([
    getInsumos(true),
    getReceitasAssociadasPorInsumos(),
    getVinculosOmieAssociadosPorInsumos(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <InsumosConfigClient
        initialInsumos={insumos}
        receitasPorInsumo={receitasPorInsumo}
        vinculosOmiePorInsumo={vinculosOmiePorInsumo}
      />
    </Suspense>
  );
}
