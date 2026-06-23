type BuildEtapaReabrirMensagemInput = {
  etapaNome: string;
  produzidoLabel: string;
  unidade: string;
};

export function buildEtapaReabrirMensagem(input: BuildEtapaReabrirMensagemInput): string {
  const unidade = input.unidade.toUpperCase();
  return (
    `Esta etapa de ${input.etapaNome} foi finalizada com ${input.produzidoLabel} ${unidade}. ` +
    'Reabrir para adicionar ou editar lotes. Será necessário finalizar novamente ao concluir.'
  );
}
