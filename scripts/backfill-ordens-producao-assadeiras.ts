/**
 * Backfill de ordens_producao legadas sem assadeira_id.
 *
 * Para cada ordem com assadeira_id IS NULL:
 * - resolve assadeira default do produto
 * - calcula assadeiras reversamente (unidades ou caixas)
 * - recalcula derivados (unidades, caixas)
 * - atribui ordem_planejamento sequencial por data_producao (created_at)
 *
 * Uso:
 *   npx tsx scripts/backfill-ordens-producao-assadeiras.ts [--dry-run]
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

type OrdemBackfillRow = {
  id: string;
  created_at: string;
  data_producao: string;
  data_fabricacao_etiqueta: string;
  tipo_estoque_id: string;
  produto_id: string;
  observacao: string;
  assadeira_id: string | null;
  assadeiras: number;
  ordem_planejamento: number;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

type BackfillPlan = {
  row: OrdemBackfillRow;
  assadeiraId: string | null;
  assadeiras: number;
  unidadesPorAssadeira: number;
  boxUnits: number | null;
  quantidade: {
    unidades: number;
    caixas: number;
    pacotes: number;
    kg: number;
  };
  ordemPlanejamento: number;
  needsManualReview: boolean;
  reviewReason: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ORDENS_PRODUCAO_TABLE = 'ordens_producao' as any;

function calcAssadeirasFromQuantidades(
  row: OrdemBackfillRow,
  fator: number,
  boxUnits: number | null,
): number {
  if (row.unidades > 0) {
    return row.unidades / fator;
  }
  if (row.caixas > 0 && boxUnits && boxUnits > 0) {
    const unidades = row.caixas * boxUnits;
    return unidades / fator;
  }
  return 0;
}

async function main() {
  const { deriveQuantidadesFromAssadeiras } = await import(
    '../src/domain/producao/ordem-derivados'
  );
  const { ordemProducaoService, EstoqueResolverError } = await import(
    '../src/lib/services/ordem-producao-service'
  );
  const { ordemProducaoRepository } = await import(
    '../src/data/producao/OrdemProducaoRepository'
  );
  const { supabaseClientFactory } = await import(
    '../src/lib/clients/supabase-client-factory'
  );

  if (!process.env.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL não configurada. Verifique o arquivo .env.local na raiz do projeto.',
    );
  }

  const dryRun = process.argv.includes('--dry-run');
  console.log(
    `[backfill-ordens-producao-assadeiras]${dryRun ? ' (dry-run)' : ''}`,
  );

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from(ORDENS_PRODUCAO_TABLE)
    .select('*')
    .is('assadeira_id', null)
    .order('data_producao', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar ordens sem assadeira: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as OrdemBackfillRow[];
  const plans: BackfillPlan[] = [];

  for (const row of rows) {
    let assadeiraId: string | null = null;
    let unidadesPorAssadeira = 0;
    let boxUnits: number | null = null;
    let reviewReason: string | null = null;

    try {
      const resolved = await ordemProducaoService.resolveAssadeiraDefault(
        row.produto_id,
      );
      assadeiraId = resolved.assadeiraId;
      unidadesPorAssadeira = resolved.unidadesPorAssadeiraEfetiva;
      boxUnits = resolved.boxUnits;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reviewReason = message;
      if (!(err instanceof EstoqueResolverError)) {
        console.warn(`[backfill] erro ao resolver assadeira ordem ${row.id}: ${message}`);
      }
    }

    const assadeiras =
      assadeiraId && unidadesPorAssadeira > 0
        ? calcAssadeirasFromQuantidades(row, unidadesPorAssadeira, boxUnits)
        : 0;

    if (assadeiras === 0 && !reviewReason) {
      reviewReason = 'assadeiras=0 (sem unidades/caixas conversíveis)';
      console.warn(
        `[backfill] ordem ${row.id} (${row.data_producao}) ${reviewReason}`,
      );
    }

    const quantidade =
      assadeiraId && unidadesPorAssadeira > 0
        ? deriveQuantidadesFromAssadeiras({
            assadeiras,
            unidadesPorAssadeira,
            boxUnits,
          })
        : {
            unidades: row.unidades,
            caixas: row.caixas,
            pacotes: row.pacotes,
            kg: Number(row.kg),
          };

    plans.push({
      row,
      assadeiraId,
      assadeiras,
      unidadesPorAssadeira,
      boxUnits,
      quantidade,
      ordemPlanejamento: 0,
      needsManualReview: reviewReason !== null,
      reviewReason,
    });
  }

  const byDate = new Map<string, BackfillPlan[]>();
  for (const plan of plans) {
    const list = byDate.get(plan.row.data_producao) ?? [];
    list.push(plan);
    byDate.set(plan.row.data_producao, list);
  }

  for (const [, datePlans] of byDate) {
    datePlans.sort((a, b) =>
      a.row.created_at.localeCompare(b.row.created_at),
    );
    datePlans.forEach((plan, index) => {
      plan.ordemPlanejamento = index + 1;
    });
  }

  const stats = {
    candidatos: rows.length,
    atualizaveis: 0,
    revisaoManual: 0,
    errosUpdate: 0,
  };

  const manualReview: BackfillPlan[] = [];

  for (const plan of plans) {
    if (plan.needsManualReview) {
      stats.revisaoManual += 1;
      manualReview.push(plan);
      continue;
    }

    stats.atualizaveis += 1;

    if (dryRun) continue;

    try {
      await ordemProducaoRepository.updatePedidoFields(plan.row.id, {
        dataProducao: plan.row.data_producao,
        dataFabricacaoEtiqueta: plan.row.data_fabricacao_etiqueta,
        tipoEstoqueId: plan.row.tipo_estoque_id,
        produtoId: plan.row.produto_id,
        observacao: plan.row.observacao,
        assadeiraId: plan.assadeiraId!,
        assadeiras: plan.assadeiras,
        ordemPlanejamento: plan.ordemPlanejamento,
        quantidade: plan.quantidade,
      });
    } catch (err) {
      stats.errosUpdate += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[backfill] erro ao atualizar ordem ${plan.row.id}: ${message}`);
    }
  }

  console.log('[backfill-ordens-producao-assadeiras] concluído');
  console.log(`  candidatos: ${stats.candidatos}`);
  console.log(`  atualizáveis: ${stats.atualizaveis}`);
  console.log(`  revisão manual: ${stats.revisaoManual}`);
  if (!dryRun) {
    console.log(`  erros update: ${stats.errosUpdate}`);
  }

  if (manualReview.length > 0) {
    console.log(`  ordens para revisão manual (${manualReview.length}):`);
    for (const plan of manualReview.slice(0, 30)) {
      console.log(
        `    - ${plan.row.id} | ${plan.row.data_producao} | produto ${plan.row.produto_id} | ${plan.reviewReason}`,
      );
    }
    if (manualReview.length > 30) {
      console.log(`    ... e mais ${manualReview.length - 30}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/*
 * Após backfill bem-sucedido, executar no Supabase:
 *
 * ALTER TABLE ordens_producao ALTER COLUMN assadeira_id SET NOT NULL;
 * DROP TABLE IF EXISTS _ordens_producao_legacy CASCADE;
 */
