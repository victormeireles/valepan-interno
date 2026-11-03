import { listColaboradores } from '@/app/actions/pessoas-actions';
import { listTurnosVinculo } from '@/app/actions/pessoas-vinculo-actions';
import PessoasLista from '@/features/pessoas/components/PessoasLista';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; aviso?: string }>;
}) {
  const params = await searchParams;
  const sessao = await requireInternoModulo('interno_pessoas', 'ler');
  const podeAdministrar = new InternoAccessManager().temModulo(sessao, 'interno_pessoas', 'administrar');
  const [itens, turnos] = await Promise.all([listColaboradores(), listTurnosVinculo()]);
  return <PessoasLista itens={itens} turnos={turnos} filtrosIniciais={params} podeAdministrar={podeAdministrar} />;
}
