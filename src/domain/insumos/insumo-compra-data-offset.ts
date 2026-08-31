const MEIO_DIA_SP = 'T12:00:00-03:00';

export function offsetDiasIso(dataReferencia: string, dataAlvo: string): number {
  const inicio = Date.parse(`${dataReferencia}${MEIO_DIA_SP}`);
  const alvo = Date.parse(`${dataAlvo}${MEIO_DIA_SP}`);
  return Math.round((alvo - inicio) / 86_400_000);
}

export function dataEfetivaIso(dataPrevista: string, dataReferencia: string): string {
  return dataPrevista < dataReferencia ? dataReferencia : dataPrevista;
}
