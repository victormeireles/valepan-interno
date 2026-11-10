import { listarPecas } from '@/app/manutencao/manutencao-peca-consulta';
import { PecasPainel } from '@/features/manutencao/components/PecasPainel';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function PecasPage() {
  const snap = await requireInternoModulo('interno_manutencao', 'ler');
  const pecas = await listarPecas();
  const acesso = new ManutencaoAcesso();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <PecasPainel
        pecas={pecas}
        podeCadastrar={acesso.administra(snap)}
        podeMovimentar={acesso.movimenta(snap)}
      />
    </div>
  );
}
