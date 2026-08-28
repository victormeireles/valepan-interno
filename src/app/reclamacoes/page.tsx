import {
  listReclamacaoFormOpcoes,
  listReclamacoes,
} from '@/app/actions/reclamacao-actions';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { RECLAMACAO_FILTRO_VAZIO } from '@/domain/reclamacoes/reclamacao-types';
import ReclamacoesPageClient from '@/features/reclamacoes/components/ReclamacoesPageClient';

export const dynamic = 'force-dynamic';

export default async function ReclamacoesPage() {
  await requireInternoModulo('interno_reclamacoes', 'ler');
  const [itens, opcoes] = await Promise.all([
    listReclamacoes(RECLAMACAO_FILTRO_VAZIO),
    listReclamacaoFormOpcoes(),
  ]);

  return <ReclamacoesPageClient initialItens={itens} opcoes={opcoes} />;
}
