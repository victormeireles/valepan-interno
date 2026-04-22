import {
  startProductionStep,
  completeProductionStep,
} from '@/app/actions/producao-etapas-actions';
import type { FermentacaoQualityData } from '@/domain/types/producao-etapas';

const ASSADEIRAS_MAX = 20;

export type FermentacaoIniciarEFinalizarInput = {
  ordemProducaoId: string;
  numeroCarrinho: string;
  assadeirasProduzidas: number;
  unidadesAssadeira: number | null | undefined;
};

/**
 * Abre o log de fermentação e já o conclui com carrinho e assadeiras (fluxo único, sem etapa “só iniciar”).
 */
export async function fermentacaoIniciarEFinalizar(
  input: FermentacaoIniciarEFinalizarInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const carrinhoTrim = input.numeroCarrinho.trim();
  if (!carrinhoTrim) {
    return { success: false, error: 'Informe o número do carrinho.' };
  }

  const ass = Math.round(input.assadeirasProduzidas);
  if (!Number.isFinite(ass) || ass < 1 || ass > ASSADEIRAS_MAX) {
    return {
      success: false,
      error: `Informe a quantidade de assadeiras entre 1 e ${ASSADEIRAS_MAX}.`,
    };
  }

  const ua = input.unidadesAssadeira;
  const qtdSaida =
    ua != null && Number(ua) > 0 ? ass * Number(ua) : 0;

  const start = await startProductionStep({
    ordem_producao_id: input.ordemProducaoId,
    etapa: 'fermentacao',
    qtd_saida: 0,
    dados_qualidade: {},
  });

  if (!start.success || !start.data) {
    return { success: false, error: start.error || 'Não foi possível iniciar a fermentação.' };
  }

  const dadosQualidade: FermentacaoQualityData = {
    observacoes: '',
    numero_carrinho: carrinhoTrim,
    assadeiras_lt: ass,
  };

  const done = await completeProductionStep({
    log_id: start.data.id,
    qtd_saida: qtdSaida,
    dados_qualidade: dadosQualidade,
    fotos: [],
  });

  if (!done.success) {
    return { success: false, error: done.error || 'Fermentação iniciada, mas falhou ao finalizar. Verifique na tela da ordem.' };
  }

  return { success: true };
}

export { ASSADEIRAS_MAX as FERMENTACAO_ASSADEIRAS_MAX };
