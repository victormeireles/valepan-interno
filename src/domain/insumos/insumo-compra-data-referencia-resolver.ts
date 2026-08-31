export class InsumoCompraDataReferenciaResolver {
  resolve(dataReferencia?: string): { isoDate: string; anchor: Date; dayOfWeek: number } {
    const isoDate = this.isValidIsoDate(dataReferencia)
      ? dataReferencia
      : this.toSaoPauloIsoDate(new Date());
    const anchor = new Date(`${isoDate}T12:00:00-03:00`);

    return { isoDate, anchor, dayOfWeek: anchor.getUTCDay() };
  }

  private isValidIsoDate(value?: string): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  private toSaoPauloIsoDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));
    return `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')}`;
  }
}
