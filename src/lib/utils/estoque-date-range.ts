export type EstoqueDatePreset = 'hoje' | 'ontem' | '7dias';

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getPresetRange(
  preset: EstoqueDatePreset,
  now: Date = new Date(),
): { de: string; ate: string } {
  const ate = formatDateInput(now);
  if (preset === 'hoje') {
    return { de: ate, ate };
  }
  if (preset === 'ontem') {
    const ontem = formatDateInput(addDays(now, -1));
    return { de: ontem, ate: ontem };
  }
  const de = formatDateInput(addDays(now, -6));
  return { de, ate };
}

/** Alinha com /estoque/auditoria: dia civil em UTC na query string. */
export function dateInputsToIsoRange(de: string, ate: string): { de: string; ate: string } {
  return {
    de: `${de}T00:00:00.000Z`,
    ate: `${ate}T23:59:59.999Z`,
  };
}
