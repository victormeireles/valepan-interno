import { CalendarioDiaUtil } from './calendario-dia-util';

export class FaltaDatasRotulo {
  constructor(private readonly calendario = new CalendarioDiaUtil()) {}

  resumir(datas: string[]): string {
    return this.listar(datas).join(' · ');
  }

  listar(datas: string[]): string[] {
    return this.agrupar(datas).map((grupo) => this.formatar(grupo));
  }

  private agrupar(datas: string[]): string[][] {
    const unicas = [...new Set(datas.map((data) => data.slice(0, 10)).filter(Boolean))].sort();
    const grupos: string[][] = [];
    for (const data of unicas) {
      const atual = grupos[grupos.length - 1];
      const ultima = atual?.[atual.length - 1];
      if (!atual || !ultima || this.calendario.proximoUtil(ultima) < data) {
        grupos.push([data]);
        continue;
      }
      atual.push(data);
    }
    return grupos;
  }

  private formatar(grupo: string[]): string {
    const inicio = grupo[0];
    const fim = grupo[grupo.length - 1];
    if (!inicio || inicio === fim) return this.diaMes(inicio);
    if (inicio.slice(0, 7) === fim.slice(0, 7)) {
      return `${inicio.slice(8, 10)}–${this.diaMes(fim)}`;
    }
    return `${this.diaMes(inicio)}–${this.diaMes(fim)}`;
  }

  private diaMes(iso: string | undefined): string {
    if (!iso) return '';
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  }
}
