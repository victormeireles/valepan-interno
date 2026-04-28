import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { getProductionOrderWithProduct } from '@/app/actions/producao-etapas-actions';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import { PRODUCTION_STEP_DENSE_SHELL } from '@/components/Producao/production-step-form-classes';
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
      backHref={filaUrlForProductionStep('entrada_embalagem')}
      denseHeader
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <p className="sr-only">
        Carrinhos da saída do forno; informar latas que entram na embalagem. Etapa entrada_embalagem.
      </p>
      <EntradaEmbalagemStepClient ordemProducaoId={o.id} produtoNome={produto.nome ?? 'Produto'} />
    </ProductionStepLayout>
  );
}
