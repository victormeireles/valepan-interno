import { VencimentoExperiencia } from './vencimento-experiencia';

export type PrazoExperiencia = 30 | 60;

export type ProximoVencimento = {
  prazo: PrazoExperiencia;
  iso: string;
  data: string;
  diasRestantes: number;
};

const PRAZOS: PrazoExperiencia[] = [30, 60];

export class ProximoVencimentoExperiencia {
  static readonly ALERTA_DIAS = 7;

  constructor(private readonly vencimento = new VencimentoExperiencia()) {}

  proximo(dataAdmissao: string | null, hoje: string): ProximoVencimento | null {
    for (const prazo of PRAZOS) {
      const iso = this.vencimento.dataIso(dataAdmissao, prazo, hoje);
      if (!iso) continue;
      return { prazo, iso, data: this.vencimento.exibir(dataAdmissao, prazo, hoje), diasRestantes: this.diasAte(hoje, iso) };
    }
    return null;
  }

  pertoDeVencer(dataAdmissao: string | null, hoje: string): boolean {
    const proximo = this.proximo(dataAdmissao, hoje);
    return proximo !== null && proximo.diasRestantes <= ProximoVencimentoExperiencia.ALERTA_DIAS;
  }

  legenda(vencimento: ProximoVencimento): string {
    const marco = `Vencimento de ${vencimento.prazo} dias`;
    if (vencimento.diasRestantes === 0) return `${marco} é hoje`;
    if (vencimento.diasRestantes === 1) return `${marco} é amanhã`;
    return `${marco} em ${vencimento.diasRestantes} dias`;
  }

  private diasAte(hoje: string, iso: string): number {
    const inicio = Date.parse(`${hoje}T00:00:00Z`);
    const fim = Date.parse(`${iso}T00:00:00Z`);
    return Math.round((fim - inicio) / 86_400_000);
  }
}
