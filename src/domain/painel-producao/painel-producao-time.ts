export function toMinutesFromClock(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

const MINUTES_PER_DAY = 24 * 60;

/** Duração da janela; fim ≤ início conta como dia seguinte. */
export function janelaDurationMinutes(inicio: string, fim: string): number {
  const ini = toMinutesFromClock(inicio);
  const end = toMinutesFromClock(fim);
  if (end === ini) return 0;
  const span = end - ini;
  return span > 0 ? span : span + MINUTES_PER_DAY;
}

/** Minutos decorridos na janela, limitados a [0, duração]. */
export function janelaElapsedMinutes(
  agoraMin: number,
  inicio: string,
  fim: string,
): number {
  const ini = toMinutesFromClock(inicio);
  const end = toMinutesFromClock(fim);
  const duration = janelaDurationMinutes(inicio, fim);
  if (duration <= 0) return 0;

  let agora = agoraMin;
  if (end <= ini && agoraMin < ini) {
    agora = agoraMin + MINUTES_PER_DAY;
  }

  const elapsed = agora - ini;
  return Math.min(duration, Math.max(0, elapsed));
}

export function janelaExpectedFraction(
  agoraMin: number,
  inicio: string,
  fim: string,
): number {
  const duration = janelaDurationMinutes(inicio, fim);
  if (duration <= 0) return 0;
  return janelaElapsedMinutes(agoraMin, inicio, fim) / duration;
}

/** Rótulo operacional: `07:00` → `7h`, `21:50` → `21h50`. */
export function formatJanelaClockLabel(hm: string): string {
  const minutes = toMinutesFromClock(hm);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  if (minute === 0) return `${hour}h`;
  return `${hour}h${String(minute).padStart(2, '0')}`;
}

export function formatJanelaRange(inicio: string, fim: string): string {
  return `${formatJanelaClockLabel(inicio)} → ${formatJanelaClockLabel(fim)}`;
}

export function formatClockFromMinutes(min: number): string {
  return `${Math.floor(min / 60)}h${String(Math.round(min) % 60).padStart(2, '0')}`;
}

export function formatDurationFromMinutes(min: number): string {
  if (min >= 60) {
    return `${Math.floor(min / 60)}h${String(Math.round(min) % 60).padStart(2, '0')}`;
  }
  return `${Math.round(min)}min`;
}

export function formatOpLabelFromDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  return `OP ${isoDate.slice(0, 4)}-${isoDate.slice(5, 7)}${isoDate.slice(8, 10)}`;
}

export function formatAgoraLabel(hour: number, minute: number): string {
  return `${hour}h${String(minute).padStart(2, '0')}`;
}
