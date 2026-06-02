import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { getProductionOrderWithProduct, getProductionStepLogs } from '@/app/actions/producao-etapas-actions';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import { PRODUCTION_STEP_DENSE_SHELL } from '@/components/Producao/production-step-form-classes';
import SaidaEmbalagemPhotoClient from './SaidaEmbalagemPhotoClient';
import { getMetaCaixasSaidaEmbalagem } from '@/lib/utils/production-conversions';
import type { ProductionStepLog, SaidaEmbalagemQualityData } from '@/domain/types/producao-etapas';

export const dynamic = 'force-dynamic';

/** Mesma regra que `getProductionQueue`: valor do log de saída emb. com `inicio` mais recente que tenha caixas. */
function caixasRecebidasMaisRecenteNosLogs(logs: ProductionStepLog[]): number | null {
  let best: { t: number; v: number } | null = null;
  for (const l of logs) {
    if (l.etapa !== 'saida_embalagem') continue;
    const dq = l.dados_qualidade as SaidaEmbalagemQualityData | undefined;
    const cr = dq?.caixas_recebidas;
    if (cr == null || !Number.isFinite(Number(cr))) continue;
    const t = new Date(l.inicio).getTime();
    if (!best || t >= best.t) {
      best = { t, v: Math.round(Number(cr)) };
    }
  }
  return best?.v ?? null;
}

/** Todas as URLs em `producao_etapas_log.fotos` desta etapa, por ordem cronológica de `inicio`, sem duplicar. */
function fotosSaidaEmbalagemNosLogs(logs: ProductionStepLog[]): string[] {
  const saida = logs
    .filter((l) => l.etapa === 'saida_embalagem' && l.inicio)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of saida) {
    for (const u of l.fotos ?? []) {
      const url = typeof u === 'string' ? u.trim() : '';
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  return out;
}

interface PageProps {
  params: Promise<{ ordemId: string }>;
}

export default async function SaidaEmbalagemPage({ params }: PageProps) {
  noStore();
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
  const initialCaixasRecebidas =
    logsRes.success && logsRes.data ? caixasRecebidasMaisRecenteNosLogs(logsRes.data) : null;
  const initialFotosSalvas =
    logsRes.success && logsRes.data ? fotosSaidaEmbalagemNosLogs(logsRes.data) : [];

  const caixasPlanejadas = (o as { caixasPlanejadas?: number | null }).caixasPlanejadas;
  const metaCaixas =
    caixasPlanejadas != null && Number.isFinite(caixasPlanejadas) && caixasPlanejadas > 0
      ? {
          caixasEsperadas: caixasPlanejadas,
          resumo: `${caixasPlanejadas} cx`,
          subtexto: 'Caixas planejadas na ordem (conversão do planejamento, considerando o tipo de caixa).',
        }
      : getMetaCaixasSaidaEmbalagem(o.qtd_planejada, {
          unidadeNomeResumido: produto.unidadeNomeResumido,
          box_units: produto.box_units,
          package_units: produto.package_units,
          unidades_assadeira: produto.unidades_assadeira,
          receita_massa: produto.receita_massa,
        });

  return (
    <ProductionStepLayout
      etapaNome="Saída de embalagem"
      loteCodigo={o.lote_codigo}
      produtoNome={produto.nome ?? 'Produto'}
      backHref={filaUrlForProductionStep('saida_embalagem')}
      denseHeader
      registrosEtapa={{ ordemProducaoId: o.id, etapa: 'saida_embalagem' }}
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <p className="sr-only">
        Contagem de caixas embaladas e foto opcional do lote. Etapa saída de embalagem.
      </p>
      <SaidaEmbalagemPhotoClient
        ordemProducaoId={o.id}
        produtoNome={produto.nome ?? 'Produto'}
        metaCaixas={metaCaixas}
        initialCaixasRecebidas={initialCaixasRecebidas}
        initialFotosSalvas={initialFotosSalvas}
      />
    </ProductionStepLayout>
  );
}
