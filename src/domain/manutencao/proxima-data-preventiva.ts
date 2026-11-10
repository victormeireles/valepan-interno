export type FrequenciaPlano =
  | { tipo: 'a_cada_n_dias'; intervalo: number; ancora: string }
  | { tipo: 'semanal'; diaSemana: number }
  | { tipo: 'mensal'; diaMes: number };

type PartesIso = { ano: number; mes: number; dia: number };

export class ProximaDataPreventiva {
  constructor(private readonly calendario = new CalendarioIso()) {}

  /** Menor data estritamente depois de hojeSP que encaixa. */
  depoisDeHoje(freq: FrequenciaPlano, hojeSp: string): string {
    if (freq.tipo === 'a_cada_n_dias') return this.depoisIntervalo(freq, hojeSp);
    if (freq.tipo === 'semanal') return this.depoisSemana(freq.diaSemana, hojeSp);
    return this.depoisMes(freq.diaMes, hojeSp);
  }

  /** Valida que a primeira data encaixa na frequência. */
  encaixa(freq: FrequenciaPlano, data: string): boolean {
    if (freq.tipo === 'a_cada_n_dias') return this.encaixaIntervalo(freq, data);
    if (freq.tipo === 'semanal') return this.encaixaSemana(freq.diaSemana, data);
    return this.encaixaMes(freq.diaMes, data);
  }

  private depoisIntervalo(
    freq: { intervalo: number; ancora: string },
    hojeSp: string,
  ): string {
    const passos = this.passosDepois(freq.ancora, hojeSp, freq.intervalo);
    return this.calendario.somarDias(freq.ancora, passos * freq.intervalo);
  }

  private passosDepois(ancora: string, hojeSp: string, intervalo: number): number {
    if (hojeSp < ancora) return 0;
    const decorridos = this.calendario.diasEntre(ancora, hojeSp);
    return Math.floor(decorridos / intervalo) + 1;
  }

  private depoisSemana(diaSemana: number, hojeSp: string): string {
    const atual = this.calendario.diaSemana(hojeSp);
    let salto = diaSemana - atual;
    if (salto <= 0) salto += 7;
    return this.calendario.somarDias(hojeSp, salto);
  }

  private depoisMes(diaMes: number, hojeSp: string): string {
    const partes = this.calendario.exigir(hojeSp);
    if (partes.dia < diaMes) return this.calendario.iso(partes.ano, partes.mes, diaMes);
    const virouAno = partes.mes === 12;
    const ano = virouAno ? partes.ano + 1 : partes.ano;
    const mes = virouAno ? 1 : partes.mes + 1;
    return this.calendario.iso(ano, mes, diaMes);
  }

  private encaixaIntervalo(
    freq: { intervalo: number; ancora: string },
    dataIso: string,
  ): boolean {
    if (!this.intervaloInteiro(freq.intervalo) || dataIso < freq.ancora) return false;
    const decorridos = this.calendario.diasEntre(freq.ancora, dataIso);
    return decorridos % freq.intervalo === 0;
  }

  private encaixaSemana(diaSemana: number, dataIso: string): boolean {
    if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 7) return false;
    return this.calendario.diaSemana(dataIso) === diaSemana;
  }

  private encaixaMes(diaMes: number, dataIso: string): boolean {
    if (!Number.isInteger(diaMes) || diaMes < 1 || diaMes > 28) return false;
    return this.calendario.diaDoMes(dataIso) === diaMes;
  }

  private intervaloInteiro(intervalo: number): boolean {
    return Number.isInteger(intervalo) && intervalo >= 1;
  }
}

class CalendarioIso {
  somarDias(iso: string, dias: number): string {
    const partes = this.exigir(iso);
    const calendario = new Date(partes.ano, partes.mes - 1, partes.dia + dias, 12, 0, 0);
    return this.iso(calendario.getFullYear(), calendario.getMonth() + 1, calendario.getDate());
  }

  diasEntre(de: string, ate: string): number {
    const inicio = this.meioDia(de);
    const fim = this.meioDia(ate);
    if (inicio === null || fim === null) return Number.NaN;
    return Math.round((fim - inicio) / 86_400_000);
  }

  diaDoMes(iso: string): number | null {
    return this.partes(iso)?.dia ?? null;
  }

  diaSemana(iso: string): number {
    const partes = this.partes(iso);
    if (!partes) return 0;
    const calendario = new Date(partes.ano, partes.mes - 1, partes.dia, 12, 0, 0);
    const domingoZero = calendario.getDay();
    return domingoZero === 0 ? 7 : domingoZero;
  }

  exigir(iso: string): PartesIso {
    const partes = this.partes(iso);
    if (!partes) throw new Error('Data inválida.');
    return partes;
  }

  iso(ano: number, mes: number, dia: number): string {
    const mesTexto = String(mes).padStart(2, '0');
    const diaTexto = String(dia).padStart(2, '0');
    return `${ano}-${mesTexto}-${diaTexto}`;
  }

  private meioDia(iso: string): number | null {
    const partes = this.partes(iso);
    if (!partes) return null;
    return new Date(partes.ano, partes.mes - 1, partes.dia, 12, 0, 0).getTime();
  }

  private partes(iso: string): PartesIso | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return null;
    const ano = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    if (!this.confere(ano, mes, dia)) return null;
    return { ano, mes, dia };
  }

  private confere(ano: number, mes: number, dia: number): boolean {
    const calendario = new Date(ano, mes - 1, dia, 12, 0, 0);
    return (
      calendario.getFullYear() === ano &&
      calendario.getMonth() === mes - 1 &&
      calendario.getDate() === dia
    );
  }
}
