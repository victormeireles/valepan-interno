import type { PainelProducaoStageView } from '@/domain/painel-producao/painel-producao-types';
import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';

export { toMinutesFromClock };

export function formatPainelNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function progressPctOfStage(stage: Pick<PainelProducaoStageView, 'done' | 'meta'>): number {
  if (stage.meta <= 0) return 0;
  return Math.min(100, Math.round((stage.done / stage.meta) * 100));
}

export function parseAgoraMinFromLabel(agora: string): number {
  const match = agora.match(/^(\d+)h(\d{2})$/);
  if (!match) return toMinutesFromClock('18:00');
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatHourFromMinutes(min: number): string {
  const roundedMin = Math.round(min);
  const dayOffset = Math.floor(roundedMin / (24 * 60));
  const minutesInDay = ((roundedMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const formattedHour = `${hour}h${String(minute).padStart(2, '0')}`;

  return dayOffset > 0 ? `amanhã ${formattedHour}` : formattedHour;
}
