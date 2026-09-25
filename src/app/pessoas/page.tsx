import { listColaboradores } from '@/app/actions/pessoas-actions';
import PessoasLista from '@/features/pessoas/components/PessoasLista';

export const dynamic = 'force-dynamic';

export default async function PessoasPage() {
  const itens = await listColaboradores();
  return <PessoasLista itens={itens} />;
}
