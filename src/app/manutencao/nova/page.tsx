import { redirect } from 'next/navigation';
import { listarMaquinasAbertura } from '@/app/actions/manutencao-maquinas-abertura';
import { NovaOrdemFormulario } from '@/features/manutencao/components/NovaOrdemFormulario';
import {
  MODULOS_MANUTENCAO_ENTRADA,
  ManutencaoAcesso,
} from '@/domain/manutencao/manutencao-acesso';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function NovaOrdemPage() {
  const { snap } = await requireInternoQualquerModulo(MODULOS_MANUTENCAO_ENTRADA, 'ler');
  if (!new ManutencaoAcesso().abreCorretiva(snap)) redirect('/?erro=sem-permissao');

  const maquinas = await listarMaquinasAbertura();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <NovaOrdemFormulario maquinas={maquinas} />
    </div>
  );
}
