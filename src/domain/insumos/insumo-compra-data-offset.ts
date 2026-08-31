const MEIO_DIA_SP = 'T12:00:00-03:00';

export function offsetDiasIso(dataReferencia: string, dataAlvo: string): number {
  const inicio = Date.parse(`${dataReferencia}${MEIO_DIA_SP}`);
  const alvo = Date.parse(`${dataAlvo}${MEIO_DIA_SP}`);
  return Math.round((alvo - inicio) / 86_400_000);
}

export function addDaysIso(dataReferencia: string, dias: number): string {
  const ms = Date.parse(`${dataReferencia}${MEIO_DIA_SP}`) + dias * 86_400_000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function dataEfetivaIso(dataPrevista: string, dataReferencia: string): string {
  return dataPrevista < dataReferencia ? dataReferencia : dataPrevista;
}
