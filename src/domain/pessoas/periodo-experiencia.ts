export class PeriodoExperiencia {
  vigente(dataAdmissao: string | null, hoje: string): boolean {
    const dias = this.diasDesde(dataAdmissao, hoje);
    return dias !== null && dias >= 0 && dias < 30;
  }

  private diasDesde(inicio: string | null, hoje: string): number | null {
    if (!inicio || !this.iso(inicio) || !this.iso(hoje)) return null;
    const admissao = Date.parse(`${inicio}T00:00:00Z`);
    const referencia = Date.parse(`${hoje}T00:00:00Z`);
    if (Number.isNaN(admissao) || Number.isNaN(referencia)) return null;
    return Math.round((referencia - admissao) / 86_400_000);
  }

  private iso(valor: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(valor);
  }
}
