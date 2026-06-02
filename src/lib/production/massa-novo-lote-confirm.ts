const MASSA_META_EPS = 1e-9;

/** Mesmo critério da barra de progresso / `massaMetaConcluida` na fila. */
export function massaReceitasMetaAtingida(
  receitasJaBatidas: number,
  receitasNecessarias: number,
): boolean {
  return receitasNecessarias > 0 && receitasJaBatidas + MASSA_META_EPS >= receitasNecessarias;
}

/**
 * Pede confirmação quando a meta de receitas da OP já foi atingida.
 * @returns true se pode prosseguir com novo lote.
 */
export function confirmarNovoLoteMassaAlemDaMeta(): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(
    'A meta de receitas desta ordem já foi atingida.\n\n' +
      'Deseja registrar mais um lote de massa? Isso é comum quando houve perda ou refugo nas etapas seguintes.',
  );
}

/** Confirma só se a meta já estiver atingida; caso contrário segue direto. */
export function pedirConfirmacaoSeMassaMetaAtingida(
  receitasJaBatidas: number,
  receitasNecessarias: number,
): boolean {
  if (!massaReceitasMetaAtingida(receitasJaBatidas, receitasNecessarias)) return true;
  return confirmarNovoLoteMassaAlemDaMeta();
}
