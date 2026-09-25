import { listExtras, listSetoresExtra } from '@/app/actions/pessoas-extras-actions';
import { ExtrasLista } from '@/features/pessoas/components/ExtrasLista';

export const dynamic = 'force-dynamic';

export default async function PessoasExtrasPage() {
  const [{ pessoas, servicos }, setores] = await Promise.all([listExtras(), listSetoresExtra()]);
  return <ExtrasLista pessoas={pessoas} servicos={servicos} setores={setores} />;
}
