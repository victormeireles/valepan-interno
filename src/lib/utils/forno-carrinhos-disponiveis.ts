import type {
  FermentacaoQualityData,
  FornoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';

/** Dados agregados na fila (JSON-friendly). */
export type CarrinhoDisponivelFila = {
  log_id: string;
  carrinho: string;
  em_fermentacao: boolean;
  /** Latas registradas na fermentação (referência; a entrada no forno pode ser menor por perdas). */
  latas_registradas: number;
};

export type CarrinhoDisponivelVM = CarrinhoDisponivelFila & {
  pode_colocar_no_forno: boolean;
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
    });
  }

  const inicioById = new Map(fermsOrd.map((x) => [x.id, x.inicio ?? '']));
  return out.sort(
    (a, b) =>
      new Date(inicioById.get(a.log_id) ?? 0).getTime() -
      new Date(inicioById.get(b.log_id) ?? 0).getTime(),
  );
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
      pode_colocar_no_forno: podeColocar,
      fermentacao_inicio: f.inicio,
    });
  }

  return out.sort(
    (a, b) =>
      new Date(a.fermentacao_inicio).getTime() - new Date(b.fermentacao_inicio).getTime(),
  );
}
