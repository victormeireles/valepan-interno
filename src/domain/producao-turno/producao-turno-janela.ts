import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';

export function isClockInJanela(agoraMin: number, inicio: string, fim: string): boolean {
  const ini = toMinutesFromClock(inicio);
  const end = toMinutesFromClock(fim);
  if (end === ini) return false;
  if (end > ini) return agoraMin >= ini && agoraMin < end;
  return agoraMin >= ini || agoraMin < end;
}
