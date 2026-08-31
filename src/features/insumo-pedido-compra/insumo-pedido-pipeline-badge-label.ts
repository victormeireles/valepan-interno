export type PipelineBadgeFormatInput = {
  atrasado: boolean;
  quantidadeLabel: string;
  proximaData: string | null;
};

export type PipelineBadgeFormat = {
  tone: 'danger' | 'accent';
  texto: string;
  detalhe: string;
  ariaSuffix: string;
};

function formatDdMm(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

export function formatPipelineBadge(
  input: PipelineBadgeFormatInput,
): PipelineBadgeFormat {
  if (input.atrasado) {
    return {
      tone: 'danger',
      texto: 'Atrasado',
      detalhe: input.quantidadeLabel,
      ariaSuffix: `${input.quantidadeLabel} atrasados`,
    };
  }

  const dataLabel = input.proximaData ? formatDdMm(input.proximaData) : null;

  return {
    tone: 'accent',
    texto: 'A chegar',
    detalhe: dataLabel
      ? `${input.quantidadeLabel} · ${dataLabel}`
      : input.quantidadeLabel,
    ariaSuffix: dataLabel
      ? `${input.quantidadeLabel} a chegar em ${dataLabel}`
      : `${input.quantidadeLabel} a chegar`,
  };
}
