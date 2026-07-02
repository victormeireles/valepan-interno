export function toMinutesFromClock(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
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
