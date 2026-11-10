import { listarMaquinas } from '@/app/actions/manutencao-maquina-actions';
import { listarPlanos } from '@/app/actions/manutencao-plano-consulta';
import { PlanosPainel } from '@/features/manutencao/components/PlanosPainel';
import type { MaquinaPlanoOpcao } from '@/features/manutencao/components/PlanoFormulario';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function PreventivaPage() {
  const snap = await requireInternoModulo('interno_manutencao', 'ler');
  const [planos, catalogo] = await Promise.all([listarPlanos(), listarMaquinas()]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <PlanosPainel
        planos={planos}
        maquinas={opcoesDeMaquina(catalogo.maquinas)}
        podeEditar={new ManutencaoAcesso().movimenta(snap)}
      />
    </div>
  );
}

function opcoesDeMaquina(
  maquinas: Awaited<ReturnType<typeof listarMaquinas>>['maquinas'],
): MaquinaPlanoOpcao[] {
  return maquinas.map((maquina) => ({
    id: maquina.id,
    codigo: maquina.codigo,
    nome: maquina.nome,
    ativo: maquina.ativo,
  }));
}
