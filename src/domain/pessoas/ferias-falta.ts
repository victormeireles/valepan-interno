import { formatISODateBrNoYear } from '@/lib/utils/date-utils';
import { FeriasPeriodo, type PeriodoFerias } from './ferias-periodo';

const periodo = new FeriasPeriodo();

export class FeriasFalta {
  atingidos(datas: string[], periodos: PeriodoFerias[]): PeriodoFerias[] {
    return periodos.filter((item) => datas.some((data) => periodo.cobre(item, data)));
  }

  mensagemAusencia(nome: string, periodos: PeriodoFerias[]): string {
    const frases = periodos.map((item) => this.ligacao(periodo.frase(item)));
    return `${nome} está de férias ${this.juntar(frases)}.`;
  }

  mensagemFaltas(datas: string[]): string {
    const rotulos = [...datas].sort().map((data) => formatISODateBrNoYear(data));
    const lista = this.juntar(rotulos);
    if (rotulos.length === 1) return `Cancele a falta de ${lista} antes de lançar as férias.`;
    return `Cancele as faltas de ${lista} antes de lançar as férias.`;
  }

  private ligacao(frase: string): string {
    return frase.includes(' a ') ? `de ${frase}` : `em ${frase}`;
  }

  private juntar(partes: string[]): string {
    if (partes.length <= 1) return partes[0] ?? '';
    const ultimo = partes[partes.length - 1];
    return `${partes.slice(0, -1).join(', ')} e ${ultimo}`;
  }
}
