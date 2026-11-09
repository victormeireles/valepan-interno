import { listarMaquinas } from '@/app/actions/manutencao-maquina-actions';
import { MaquinasPainel } from '@/features/manutencao/components/MaquinasPainel';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function MaquinasPage() {
  const snap = await requireInternoModulo('interno_manutencao', 'ler');
  const { maquinas, setores } = await listarMaquinas();
  const podeGravar = new ManutencaoAcesso().administra(snap);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <MaquinasPainel maquinas={maquinas} setores={setores} podeGravar={podeGravar} />
    </div>
  );
}
