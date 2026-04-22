import Link from 'next/link';
import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import EntradaEmbalagemStepClient from './EntradaEmbalagemStepClient';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function EntradaEmbalagemPage({ params }: PageProps) {
  const { ordemId } = await params;
  const result = await getProductionOrderWithProduct(ordemId);
  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('entrada_embalagem'));
  }
  const o = result.data;
  const produto = o.produto as { nome?: string };

  return (
    <ProductionStepLayout
      etapaNome="Entrada da Embalagem"
      loteCodigo={o.lote_codigo}
      produtoNome={produto.nome ?? 'Produto'}
    >
      <p className="text-sm text-slate-600">
        Escolha carrinhos registrados na <strong>saída do forno</strong> e informe as latas que entram na embalagem.
        Etapa: <code className="text-xs bg-slate-100 px-1 rounded">entrada_embalagem</code>.
      </p>
      <EntradaEmbalagemStepClient ordemProducaoId={o.id} produtoNome={produto.nome ?? 'Produto'} />
      <Link
        href={filaUrlForProductionStep('entrada_embalagem')}
        className="inline-flex mt-4 px-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-50"
      >
        Voltar à fila
      </Link>
    </ProductionStepLayout>
  );
}
