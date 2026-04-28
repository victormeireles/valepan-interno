import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { getProductionOrderWithProduct, getProductionStepLogs } from '@/app/actions/producao-etapas-actions';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import { PRODUCTION_STEP_DENSE_SHELL } from '@/components/Producao/production-step-form-classes';
import SaidaEmbalagemPhotoClient from './SaidaEmbalagemPhotoClient';
import { getMetaCaixasSaidaEmbalagem } from '@/lib/utils/production-conversions';
import type { SaidaEmbalagemQualityData } from '@/domain/types/producao-etapas';

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function SaidaEmbalagemPage({ params }: PageProps) {
  const { ordemId } = await params;
  const result = await getProductionOrderWithProduct(ordemId);
  if (!result.success || !result.data) {
    redirect(filaUrlForProductionStep('saida_embalagem'));
  }
  const o = result.data;
  const produto = o.produto as {
    nome?: string;
    unidadeNomeResumido: string | null;
    box_units?: number | null;
    package_units?: number | null;
    unidades_assadeira?: number | null;
    receita_massa?: { quantidade_por_produto: number } | null;
  };

  const logsRes = await getProductionStepLogs(o.id);
  let initialCaixasRecebidas: number | null = null;
  if (logsRes.success && logsRes.data) {
    const open = logsRes.data
      .filter((l) => l.etapa === 'saida_embalagem' && l.fim === null)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
    const last = open[0];
    const dq = last?.dados_qualidade as SaidaEmbalagemQualityData | undefined;
    const cr = dq?.caixas_recebidas;
    if (cr != null && Number.isFinite(Number(cr))) {
      initialCaixasRecebidas = Math.round(Number(cr));
    }
  }

  const metaCaixas = getMetaCaixasSaidaEmbalagem(o.qtd_planejada, {
    unidadeNomeResumido: produto.unidadeNomeResumido,
    box_units: produto.box_units,
    package_units: produto.package_units,
    unidades_assadeira: produto.unidades_assadeira,
    receita_massa: produto.receita_massa,
  });

  return (
    <ProductionStepLayout
      etapaNome="Saída da Embalagem"
      loteCodigo={o.lote_codigo}
      produtoNome={produto.nome ?? 'Produto'}
      backHref={filaUrlForProductionStep('saida_embalagem')}
      denseHeader
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <p className="sr-only">
        Contagem de caixas e foto opcional do lote. Etapa saida_embalagem.
      </p>
      <SaidaEmbalagemPhotoClient
        ordemProducaoId={o.id}
        produtoNome={produto.nome ?? 'Produto'}
        metaCaixas={metaCaixas}
        initialCaixasRecebidas={initialCaixasRecebidas}
      />
    </ProductionStepLayout>
  );
}
