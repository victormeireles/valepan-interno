import type { MotivoAfastamento } from './afastamento';
import { PeriodoExperiencia } from './periodo-experiencia';
import { SituacaoColaboradorRotulo, type SituacaoColaborador } from './situacao-colaborador';

export type ColaboradorPlanilhaOrigem = {
  codigo: string;
  nome: string;
  setorNome: string | null;
  turnoNome: string | null;
  dataAdmissao: string | null;
  situacao: SituacaoColaborador;
  afastamento: MotivoAfastamento | null;
  avisoAtivo: boolean;
  liderSetor: boolean;
};

export type ColaboradorPlanilhaLinha = {
  id: string;
  nome: string;
  lider: string;
  setor: string;
  turno: string;
  dataAdmissao: string;
  situacao: string;
};

export class ColaboradorPlanilha {
  constructor(
    private readonly experiencia = new PeriodoExperiencia(),
    private readonly rotulo = new SituacaoColaboradorRotulo(),
  ) {}

  montar(origem: ColaboradorPlanilhaOrigem[], hoje: string): ColaboradorPlanilhaLinha[] {
    const vigentes = origem.filter((item) => item.situacao !== 'desligado');
    const lideres = this.lideresPorSetor(vigentes);
    return vigentes
      .map((item) => this.linha(item, lideres, hoje))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id, 'pt-BR'));
  }

  private lideresPorSetor(itens: ColaboradorPlanilhaOrigem[]): Map<string, string> {
    const nomes = new Map<string, string[]>();
    for (const item of itens) {
      if (!item.liderSetor || !item.setorNome) continue;
      const lista = nomes.get(item.setorNome) ?? [];
      lista.push(item.nome);
      nomes.set(item.setorNome, lista);
    }
    return new Map([...nomes.entries()].map(([setor, lista]) => [setor, lista.join(', ')]));
  }

  private linha(
    item: ColaboradorPlanilhaOrigem,
    lideres: Map<string, string>,
    hoje: string,
  ): ColaboradorPlanilhaLinha {
    return {
      id: item.codigo,
      nome: item.nome,
      lider: item.setorNome ? (lideres.get(item.setorNome) ?? '') : '',
      setor: item.setorNome ?? '',
      turno: item.turnoNome ?? '',
      dataAdmissao: this.data(item.dataAdmissao),
      situacao: this.situacao(item, hoje),
    };
  }

  private situacao(item: ColaboradorPlanilhaOrigem, hoje: string): string {
    if (this.experiencia.vigente(item.dataAdmissao, hoje)) return 'Período de experiência';
    return this.rotulo.exibir(item.situacao, item.avisoAtivo, item.afastamento).texto;
  }

  private data(iso: string | null): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}
