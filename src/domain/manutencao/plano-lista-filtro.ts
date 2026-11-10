import type { PlanoItem } from '@/app/actions/manutencao-plano-consulta';

export class PlanoListaFiltro {
  aplicar(planos: PlanoItem[], termo: string): PlanoItem[] {
    const busca = this.normalizar(termo);
    if (!busca) return planos;
    return planos.filter((plano) => this.bate(plano, busca));
  }

  private bate(plano: PlanoItem, busca: string): boolean {
    return [
      plano.maquinaCodigo,
      plano.maquinaNome,
      plano.descricao,
      this.rotuloFrequencia(plano),
      this.rotuloData(plano.proximaEm),
    ].some((campo) => this.normalizar(campo).includes(busca));
  }

  private rotuloFrequencia(plano: PlanoItem): string {
    if (plano.frequenciaTipo === 'a_cada_n_dias') {
      const dias = plano.intervaloDias ?? 0;
      return dias === 1 ? 'A cada 1 dia' : `A cada ${dias} dias`;
    }
    if (plano.frequenciaTipo === 'semanal') {
      return `semanal ${DIAS[plano.diaSemana ?? 0] ?? ''}`.trim();
    }
    return `mensal dia ${plano.diaMes ?? ''}`.trim();
  }

  private rotuloData(iso: string): string {
    const [ano, mes, dia] = iso.slice(0, 10).split('-');
    if (!ano || !mes || !dia) return iso;
    return `${dia}/${mes}/${ano}`;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}

const DIAS = ['', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
