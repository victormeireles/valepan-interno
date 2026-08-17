/**
 * Decide se a tag da assadeira deve aparecer no card da etapa.
 * Critério: produto com mais de uma opção cadastrada (exceção ou regra), não o uso no dia.
 */
export function shouldShowAssadeiraNomeTag(input: {
  assadeiraNome?: string | null;
  temMultiplasAssadeirasCadastradas?: boolean;
}): boolean {
  const nome = input.assadeiraNome?.trim();
  return Boolean(nome) && input.temMultiplasAssadeirasCadastradas === true;
}
