import { painelPessoas } from '@/app/actions/pessoas-painel-actions';
import { PessoasPainel } from '@/features/pessoas/components/PessoasPainel';

export const dynamic = 'force-dynamic';

export default async function PessoasPainelPage() {
  const dados = await painelPessoas('2026-06-01', '2026-10-31');
  return <PessoasPainel dados={dados} />;
}
