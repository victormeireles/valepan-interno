import { listarCargos } from '@/app/actions/pessoas-cargo-actions';
import { CargosTela } from '@/features/pessoas/components/CargosTela';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function CargosPage() {
  await requireInternoModulo('interno_pessoas', 'administrar');
  const cargos = await listarCargos();
  return <CargosTela cargos={cargos} />;
}
