import { listarMaquinasAbertura } from '@/app/actions/manutencao-maquinas-abertura';
import { NovaOrdemFormulario } from '@/features/manutencao/components/NovaOrdemFormulario';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

const MODULOS_ABERTURA: readonly InternoModuloId[] = [
  'interno_manutencao',
  'interno_manutencao_solicitacao',
];

export default async function NovaOrdemPage() {
  await requireInternoQualquerModulo(MODULOS_ABERTURA, 'editar');
  const maquinas = await listarMaquinasAbertura();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <NovaOrdemFormulario maquinas={maquinas} />
    </div>
  );
}
