import { Suspense } from 'react';
import { getReceitas } from '@/app/actions/receitas-actions';
import {
  getAssadeirasAtivas,
  getProdutosComAssadeiras,
} from '@/app/actions/produto-assadeiras-actions';
import { getProdutosComReceitas } from '@/app/actions/produto-receitas-actions';
import { mergeProdutoConfigResumos } from '@/domain/produtos/produto-config-resumo';
import ProdutosConfigClient from './ProdutosConfigClient';

export const dynamic = 'force-dynamic';

export default async function ProdutosConfigPage() {
  const [produtosAssadeiras, assadeirasAtivas, produtosReceitas, receitas] =
    await Promise.all([
      getProdutosComAssadeiras(),
      getAssadeirasAtivas(),
      getProdutosComReceitas(),
      getReceitas(true),
    ]);

  const produtos = mergeProdutoConfigResumos(produtosAssadeiras, produtosReceitas);
  const receitasCatalogo = receitas.map((receita) => ({
    id: receita.id,
    nome: receita.nome,
    tipo: receita.tipo,
    ativo: receita.ativo,
  }));

  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Carregando…</div>}>
      <ProdutosConfigClient
        produtos={produtos}
        assadeirasAtivas={assadeirasAtivas}
        receitasCatalogo={receitasCatalogo}
      />
    </Suspense>
  );
}
