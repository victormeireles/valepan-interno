const MINUTO_MS = 60_000;
const URGENCIA_COM_PARADA = 'maquina_parou';

export class TempoOrdem {
  execucaoMinutos(inicioIso: string, fimIso: string): number {
    return this.minutosEntre(inicioIso, fimIso);
  }

  paradaMinutos(urgencia: string, abertaEmIso: string, fimIso: string): number {
    if (urgencia !== URGENCIA_COM_PARADA) return 0;
    return this.minutosEntre(abertaEmIso, fimIso);
  }

  private minutosEntre(inicioIso: string, fimIso: string): number {
    const decorrido = Math.abs(this.instante(fimIso) - this.instante(inicioIso));
    return Math.floor(decorrido / MINUTO_MS);
  }

  private instante(iso: string): number {
    return Date.parse(iso);
  }
}
