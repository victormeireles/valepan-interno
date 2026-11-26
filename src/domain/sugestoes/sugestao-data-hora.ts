export class SugestaoDataHora {
  formatar(iso: string): string {
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso));
    const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    return `${pegar('day')}/${pegar('month')}/${pegar('year')} ${pegar('hour')}:${pegar('minute')}`;
  }
}
