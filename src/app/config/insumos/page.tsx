import { Suspense } from 'react';
import {
  getInsumos,
  getReceitasAssociadasPorInsumos,
  getVinculosOmieAssociadosPorInsumos,
} from '@/app/actions/insumos-actions';
import { listarRegrasParaConfig } from '@/app/actions/insumo-compra-regra-actions';
import type { InsumoCompraRegraConfig } from '@/lib/services/insumo-compra-regra-manager';
import InsumosConfigClient from './InsumosConfigClient';

export const dynamic = 'force-dynamic';

function toRegrasMap(
  regras: InsumoCompraRegraConfig[],
): Record<string, InsumoCompraRegraConfig> {
  return Object.fromEntries(regras.map((regra) => [regra.insumoId, regra]));
}

export default async function InsumosConfigPage() {
  const [insumos, receitasPorInsumo, vinculosOmiePorInsumo, regrasLista] =
    await Promise.all([
      getInsumos(true),
      getReceitasAssociadasPorInsumos(),
      getVinculosOmieAssociadosPorInsumos(),
      listarRegrasParaConfig({ incluirInativos: true }),
    ]);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <InsumosConfigClient
        initialInsumos={insumos}
        receitasPorInsumo={receitasPorInsumo}
        vinculosOmiePorInsumo={vinculosOmiePorInsumo}
        regrasCompraPorInsumo={toRegrasMap(regrasLista)}
      />
    </Suspense>
  );
}
