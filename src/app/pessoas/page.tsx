import { listColaboradores } from '@/app/actions/pessoas-actions';
import { listTurnosVinculo } from '@/app/actions/pessoas-vinculo-actions';
import PessoasLista from '@/features/pessoas/components/PessoasLista';

export const dynamic = 'force-dynamic';

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; aviso?: string }>;
}) {
  const params = await searchParams;
  const [itens, turnos] = await Promise.all([listColaboradores(), listTurnosVinculo()]);
  return <PessoasLista itens={itens} turnos={turnos} filtrosIniciais={params} />;
}
