import type { QuadroLinha } from './quadro-visao';

export type QuadroPessoa = {
  codigo: string;
  nome: string;
  papel: 'ocupacao' | 'reserva' | 'apoio';
  lider: boolean;
  setorNome: string;
  turnoCodigo: string;
};

export type HorarioDiaQuadro = {
  dia: number;
  inicio: string | null;
  fim: string | null;
  terminaDiaSeguinte: boolean;
  situacao: 'definido' | 'nao_trabalha' | 'a_confirmar';
};

export type QuadroTurno = QuadroLinha & {
  pessoas: QuadroPessoa[];
  liderNome: string | null;
  horario: HorarioDiaQuadro[];
};

export type QuadroSetor = {
  setorNome: string;
  setorCodigo: string;
  turnos: QuadroTurno[];
  apoio: QuadroPessoa[];
  liderNome: string | null;
};

export class QuadroAgrupamento {
  agrupar(linhas: QuadroLinha[], pessoas: QuadroPessoa[]): QuadroSetor[] {
    const setores = new Map<string, QuadroSetor>();
    for (const linha of linhas) this.turno(setores, linha, pessoas);
    for (const pessoa of pessoas.filter((item) => item.papel === 'apoio')) {
      this.setor(setores, pessoa.setorNome).apoio.push(pessoa);
    }
    return [...setores.values()];
  }

  private turno(setores: Map<string, QuadroSetor>, linha: QuadroLinha, pessoas: QuadroPessoa[]): void {
    const setor = this.setor(setores, linha.setorNome);
    const doTurno = pessoas.filter(
      (pessoa) => pessoa.turnoCodigo === linha.turnoCodigo && pessoa.papel !== 'apoio',
    );
    setor.turnos.push({ ...linha, pessoas: doTurno, liderNome: this.lider(doTurno), horario: [] });
    setor.liderNome = setor.liderNome ?? this.lider(pessoas.filter((p) => p.setorNome === linha.setorNome));
  }

  private setor(setores: Map<string, QuadroSetor>, nome: string): QuadroSetor {
    const atual = setores.get(nome);
    if (atual) return atual;
    const novo: QuadroSetor = { setorNome: nome, setorCodigo: '', turnos: [], apoio: [], liderNome: null };
    setores.set(nome, novo);
    return novo;
  }

  private lider(pessoas: QuadroPessoa[]): string | null {
    const nomes = pessoas.filter((pessoa) => pessoa.lider).map((pessoa) => pessoa.nome);
    return nomes.length > 0 ? nomes.join(', ') : null;
  }
}
