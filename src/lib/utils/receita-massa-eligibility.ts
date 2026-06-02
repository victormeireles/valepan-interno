/**
 * Decide se um vínculo produto↔receita representa a receita de MASSA do produto.
 * Tipo efetivo: `produto_receitas.tipo` quando for "massa"; senão `receitas.tipo`.
 * Se o vínculo tiver outro tipo mas a receita for massa, aceita (cadastros legados/inconsistentes).
 */
export function isVinculoReceitaMassaAtiva(pr: {
  tipo?: string | null;
  receitas?: { tipo?: string | null; ativo?: boolean | null } | null;
}): boolean {
  const receita = pr.receitas;
  if (receita?.ativo === false) {
    return false;
  }

  const linkTipo = pr.tipo?.trim().toLowerCase();
  const receitaTipo = receita?.tipo?.trim().toLowerCase();

  if (linkTipo === 'massa') {
    return true;
  }
  if (receitaTipo === 'massa') {
    return true;
  }
  if (linkTipo != null && linkTipo !== '') {
    return false;
  }
  return false;
}
