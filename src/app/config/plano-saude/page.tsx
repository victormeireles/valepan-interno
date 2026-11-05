import { listarPlanoSaudeFaixas } from '@/app/actions/plano-saude-faixa-actions';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { PlanoSaudeFaixasClient } from './PlanoSaudeFaixasClient';

export const dynamic = 'force-dynamic';

export default async function PlanoSaudePage() {
  await requireInternoModulo('interno_config', 'administrar');
  const faixas = await listarPlanoSaudeFaixas();
  return <PlanoSaudeFaixasClient faixas={faixas} />;
}
