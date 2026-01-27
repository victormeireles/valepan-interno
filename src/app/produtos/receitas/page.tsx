import { getReceitas } from '@/app/actions/receitas-actions';
import { getProdutosComReceitas } from '@/app/actions/produto-receitas-actions';
import ProdutoReceitasClient from './ProdutoReceitasClient';

export const dynamic = 'force-dynamic';

export default async function ProdutoReceitasPage() {
  const produtos = await getProdutosComReceitas();

  const receitas = await getReceitas(true);
  const simpleReceitas = receitas.map((receita) => ({
    id: receita.id,
    nome: receita.nome,
    tipo: receita.tipo,
    ativo: receita.ativo,
  }));

  return (
    <ProdutoReceitasClient
      produtos={produtos}
      receitas={simpleReceitas}
    />
  );
}













