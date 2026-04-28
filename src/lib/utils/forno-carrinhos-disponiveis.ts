import type {
  FermentacaoQualityData,
  FornoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';

/**
 * Milissegundos para ordenação FIFO: cadastro do carrinho na fermentação, senão `inicio` do log, senão `fim`.
 * Menor valor = há mais tempo na fila (prioridade na entrada do forno).
 */
export function ordenacaoFermentacaoCarrinhoMs(
  dq: FermentacaoQualityData | null | undefined,
  inicio: string | null | undefined,
  fim: string | null | undefined,
): number {
  const raw = dq?.carrinho_cadastrado_em?.trim() || inicio?.trim() || fim?.trim() || '';
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function cmpCarrinhoFifo(
  a: { ordenacao_fermentacao_ms: number; carrinho: string },
  b: { ordenacao_fermentacao_ms: number; carrinho: string },
): number {
  const d = a.ordenacao_fermentacao_ms - b.ordenacao_fermentacao_ms;
  if (d !== 0) return d;
  return a.carrinho.localeCompare(b.carrinho, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

/** Dados agregados na fila (JSON-friendly). */
export type CarrinhoDisponivelFila = {
  log_id: string;
  carrinho: string;
  em_fermentacao: boolean;
  /** Latas registradas na fermentação (referência; a entrada no forno pode ser menor por perdas). */
  latas_registradas: number;
  ordenacao_fermentacao_ms: number;
};

export type CarrinhoDisponivelVM = CarrinhoDisponivelFila & {
  pode_colocar_no_forno: boolean;
  /** Início do log de fermentação (referência; ordenação usa {@link ordenacaoFermentacaoCarrinhoMs}). */
  fermentacao_inicio: string;
};

export type FermSnapshot = {
  id: string;
  ordem_producao_id: string;
  inicio: string | null;
  qtd_saida: number | null;
  fim: string | null;
  dados_qualidade: unknown;
};

export type FornoSnapshot = {
  ordem_producao_id: string;
  dados_qualidade: unknown;
};

/** Latas registradas no log de fermentação (referência máx. para entrada no forno). */
export function latasRegistradasNaFermentacao(
  logs: ProductionStepLog[],
  fermentacaoLogId: string | undefined,
  ua: number | null,
): number {
  if (!fermentacaoLogId) return 0;
  const f = logs.find((l) => l.id === fermentacaoLogId && l.etapa === 'fermentacao');
  if (!f) return 0;
  return totalLtFerm(f.qtd_saida, f.dados_qualidade, ua);
}

function totalLtFerm(
  qtd_saida: number | null,
  dados_qualidade: unknown,
  ua: number | null,
): number {
  const dq = dados_qualidade as FermentacaoQualityData | null;
  const lt = dq?.assadeiras_lt;
  if (lt != null && !Number.isNaN(Number(lt)) && Number(lt) > 0) return Number(lt);
  if (ua != null && ua > 0 && qtd_saida != null && !Number.isNaN(Number(qtd_saida))) {
    return Number(qtd_saida) / ua;
  }
  return 0;
}

/** Já existe qualquer registro de forno vinculado a este log de fermentação → carrinho encerrado nesta etapa. */
function hasEntradaFornoParaFermentacao(
  fornosOrdem: FornoSnapshot[],
  fermentacaoLogId: string,
): boolean {
  for (const fo of fornosOrdem) {
    const dq = fo.dados_qualidade as FornoQualityData | null;
    if (dq?.fermentacao_log_id === fermentacaoLogId) return true;
  }
  return false;
}

/**
 * Mesma regra que {@link listCarrinhosDisponiveisForno}, para uso em `getProductionQueue` (rows do Supabase).
 */
export function listCarrinhosDisponiveisForOrdemFromSnapshots(
  ordemId: string,
  ua: number | null,
  ferms: FermSnapshot[],
  fornos: FornoSnapshot[],
): CarrinhoDisponivelFila[] {
  const fermsOrd = ferms.filter((f) => f.ordem_producao_id === ordemId);
  const fornosOrd = fornos.filter((f) => f.ordem_producao_id === ordemId);
  const out: CarrinhoDisponivelFila[] = [];

  for (const f of fermsOrd) {
    const dq = f.dados_qualidade as FermentacaoQualityData | null;
    if (dq?.excluido_da_lista_forno === true) continue;

    const carrinho = dq?.numero_carrinho?.trim();
    if (!carrinho) continue;

    if (hasEntradaFornoParaFermentacao(fornosOrd, f.id)) continue;

    const total = totalLtFerm(f.qtd_saida, f.dados_qualidade, ua);
    const emFerm = f.fim == null;

    const apareceLista = (emFerm && total === 0) || total > 0;
    if (!apareceLista) continue;

    out.push({
      log_id: f.id,
      carrinho,
      em_fermentacao: emFerm,
      latas_registradas: total,
      ordenacao_fermentacao_ms: ordenacaoFermentacaoCarrinhoMs(dq, f.inicio, f.fim),
    });
  }

  return out.sort(cmpCarrinhoFifo);
}

/**
 * Carrinhos ainda não enviados ao forno nesta etapa (nenhuma entrada vinculada).
 * Um único "Colocar no forno" encerra o carrinho aqui; diferença para o registrado na fermentação = perdas.
 */
export function listCarrinhosDisponiveisForno(
  logs: ProductionStepLog[],
  unidadesPorAssadeira: number | null,
): CarrinhoDisponivelVM[] {
  const ferms = logs.filter((l) => l.etapa === 'fermentacao');
  const fornos = logs.filter((l) => l.etapa === 'entrada_forno');
  const fornoSnaps: FornoSnapshot[] = fornos.map((l) => ({
    ordem_producao_id: l.ordem_producao_id,
    dados_qualidade: l.dados_qualidade,
  }));

  const out: CarrinhoDisponivelVM[] = [];
  for (const f of ferms) {
    const dq = f.dados_qualidade as FermentacaoQualityData | null;
    if (dq?.excluido_da_lista_forno === true) continue;

    const carrinho = dq?.numero_carrinho?.trim();
    if (!carrinho) continue;

    if (hasEntradaFornoParaFermentacao(fornoSnaps, f.id)) continue;

    const total = totalLtFerm(f.qtd_saida, f.dados_qualidade, unidadesPorAssadeira);
    const emFerm = f.fim == null;

    const apareceLista = (emFerm && total === 0) || total > 0;
    if (!apareceLista) continue;

    const podeColocar = total > 0;

    out.push({
      log_id: f.id,
      carrinho,
      em_fermentacao: emFerm,
      latas_registradas: total,
      ordenacao_fermentacao_ms: ordenacaoFermentacaoCarrinhoMs(dq, f.inicio, f.fim),
      pode_colocar_no_forno: podeColocar,
      fermentacao_inicio: f.inicio ?? '',
    });
  }

  return out.sort(cmpCarrinhoFifo);
}
