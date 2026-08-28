import { listReclamacaoCategorias } from '@/app/actions/reclamacao-categoria-actions';
import CategoriasReclamacaoClient from './CategoriasReclamacaoClient';

export const dynamic = 'force-dynamic';

export default async function CategoriasReclamacaoPage() {
  const categorias = await listReclamacaoCategorias(true);

  return <CategoriasReclamacaoClient initialCategorias={categorias} />;
}
