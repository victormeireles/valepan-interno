import type { HorarioDiaQuadro } from './quadro-agrupamento';

const ROTULO = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export class HorarioSemana {
  resumir(dias: HorarioDiaQuadro[]): string[] {
    const grupos: { inicio: number; fim: number; texto: string }[] = [];
    for (const dia of [...dias].sort((a, b) => a.dia - b.dia)) {
      const texto = this.assinatura(dia);
      const ultimo = grupos.at(-1);
      if (ultimo && ultimo.texto === texto && ultimo.fim + 1 === dia.dia) ultimo.fim = dia.dia;
      else grupos.push({ inicio: dia.dia, fim: dia.dia, texto });
    }
    return grupos.map((grupo) => `${this.faixa(grupo.inicio, grupo.fim)} ${grupo.texto}`);
  }

  validar(dias: HorarioDiaQuadro[]): string | null {
    if (dias.length !== 6 || dias.some((dia) => dia.dia < 1 || dia.dia > 6)) {
      return 'Informe o horário de segunda a sábado.';
    }
    for (const dia of this.normalizar(dias)) {
      if (dia.situacao !== 'definido') continue;
      if (!dia.inicio || !dia.fim) return `${ROTULO[dia.dia]} precisa de início e fim.`;
    }
    return null;
  }

  normalizar(dias: HorarioDiaQuadro[]): HorarioDiaQuadro[] {
    return dias.map((dia) => this.dia(dia));
  }

  padrao(): HorarioDiaQuadro[] {
    return [1, 2, 3, 4, 5, 6].map((dia) => ({
      dia,
      inicio: dia === 6 ? null : '08:00',
      fim: dia === 6 ? null : '17:00',
      terminaDiaSeguinte: false,
      situacao: dia === 6 ? 'nao_trabalha' : 'definido',
    }));
  }

  private dia(entrada: HorarioDiaQuadro): HorarioDiaQuadro {
    if (entrada.situacao !== 'definido') {
      return { ...entrada, inicio: null, fim: null, terminaDiaSeguinte: false };
    }
    const inicio = this.hora(entrada.inicio);
    const fim = this.hora(entrada.fim);
    return { ...entrada, inicio, fim, terminaDiaSeguinte: this.cruzaMeiaNoite(inicio, fim) };
  }

  private assinatura(dia: HorarioDiaQuadro): string {
    if (dia.situacao === 'nao_trabalha') return 'não trabalha';
    if (dia.situacao === 'a_confirmar') return 'a confirmar';
    const inicio = this.hora(dia.inicio);
    const fim = this.hora(dia.fim);
    const extra = this.cruzaMeiaNoite(inicio, fim) ? ' +1' : '';
    return `${inicio ?? '—'}–${fim ?? '—'}${extra}`;
  }

  private faixa(inicio: number, fim: number): string {
    return inicio === fim ? ROTULO[inicio] : `${ROTULO[inicio]}–${ROTULO[fim]}`;
  }

  private cruzaMeiaNoite(inicio: string | null, fim: string | null): boolean {
    return Boolean(inicio && fim && fim <= inicio);
  }

  private hora(valor: string | null): string | null {
    if (!valor) return null;
    const match = /^(\d{2}:\d{2})/.exec(valor);
    return match ? match[1] : null;
  }
}
