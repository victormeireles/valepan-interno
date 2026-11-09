import { listarSolicitantes } from '@/app/actions/manutencao-solicitante-actions';
import { SolicitantesPainel } from '@/features/manutencao/components/SolicitantesPainel';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function SolicitantesPage() {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const { usuarios, setores } = await listarSolicitantes();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <SolicitantesPainel usuarios={usuarios} setores={setores} />
    </div>
  );
}
