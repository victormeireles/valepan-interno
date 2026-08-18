export function formatEstimativaClockHHmm(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  if (hour === undefined || minute === undefined) return null;
  return `${hour}:${minute}`;
}

export function toEstimativaView(row: {
  fermentacaoFimPrevisto: string;
  camaraFimPrevisto: string;
  fornoFimPrevisto: string;
  resfriamentoFimPrevisto: string;
  embalagemFimPrevisto: string;
}): {
  fermentacaoFim: string;
  camaraFim: string;
  fornoFim: string;
  resfriamentoFim: string;
  embalagemFim: string;
} {
  return {
    fermentacaoFim: row.fermentacaoFimPrevisto,
    camaraFim: row.camaraFimPrevisto,
    fornoFim: row.fornoFimPrevisto,
    resfriamentoFim: row.resfriamentoFimPrevisto,
    embalagemFim: row.embalagemFimPrevisto,
  };
}
