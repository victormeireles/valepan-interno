import { SugestoesLista } from '@/features/sugestoes/SugestoesLista';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoFotoStorage } from '@/lib/services/sugestao-foto-storage';
import { SugestaoListaFonteSupabase } from '@/lib/services/sugestao-lista-fonte';
import { SugestaoListaLeitura } from '@/lib/services/sugestao-lista-leitura';

export const dynamic = 'force-dynamic';

export default async function PessoasSugestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  await requireInternoModulo('interno_pessoas', 'ler');
  const bruto = (await searchParams).tema ?? '';
  const temas = new SugestaoTemaCatalogo();
  const tema = temas.aceita(bruto) ? bruto : null;
  const db = createServiceRoleClient();
  const itens = await new SugestaoListaLeitura(
    new SugestaoListaFonteSupabase(db),
    new SugestaoFotoStorage(db),
  ).listar(tema);
  return <SugestoesLista itens={itens} tema={tema} />;
}
