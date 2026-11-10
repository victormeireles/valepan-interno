import type { PlanoItem } from '@/app/actions/manutencao-plano-consulta';

const DIAS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export class PlanoListaApresentacao {
  frequencia(plano: PlanoItem): string {
    if (plano.frequenciaTipo === 'a_cada_n_dias') return this.intervalo(plano.intervaloDias);
    if (plano.frequenciaTipo === 'semanal') return this.semana(plano.diaSemana);
    return this.mes(plano.diaMes);
  }

  data(iso: string): string {
    const [ano, mes, dia] = iso.slice(0, 10).split('-');
    if (!ano || !mes || !dia) return iso;
    return `${dia}/${mes}/${ano}`;
  }

  private intervalo(dias: number | null): string {
    const quantidade = dias ?? 0;
    if (quantidade === 1) return 'A cada 1 dia';
    return `A cada ${quantidade} dias`;
  }

  private semana(dia: number | null): string {
    const nome = DIAS[dia ?? 0];
    if (!nome) return 'Semanal';
    const artigo = dia === 6 || dia === 7 ? 'Todo' : 'Toda';
    return `${artigo} ${nome}`;
  }

  private mes(dia: number | null): string {
    if (!dia) return 'Mensal';
    return `Todo dia ${dia}`;
  }
}
