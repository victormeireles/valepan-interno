export type FaltaResumoEntrada = {
  codigo: string;
  cancelada: boolean;
  setorNome: string | null;
  turnoNome: string | null;
};

export type FaltaConcentracao = {
  nome: string | null;
  pessoas: number;
  pessoasAnterior: number;
};

export type FaltaResumoComparado = {
  faltas: number;
  faltasAnterior: number;
  pessoas: number;
  pessoasAnterior: number;
  reincidentes: number;
  reincidentesAnterior: number;
  setor: FaltaConcentracao;
  turno: FaltaConcentracao;
};

export class FaltaResumoCalculo {
  comparar(atual: FaltaResumoEntrada[], anterior: FaltaResumoEntrada[]): FaltaResumoComparado {
    const agora = this.ativas(atual);
    const antes = this.ativas(anterior);
    const setor = this.concentracao(agora, antes, (item) => item.setorNome);
    const turno = this.concentracao(agora, antes, (item) => this.turnoChave(item));
    return {
      faltas: agora.length,
      faltasAnterior: antes.length,
      pessoas: this.pessoas(agora).size,
      pessoasAnterior: this.pessoas(antes).size,
      reincidentes: this.reincidentes(agora),
      reincidentesAnterior: this.reincidentes(antes),
      setor,
      turno,
    };
  }

  private ativas(itens: FaltaResumoEntrada[]): FaltaResumoEntrada[] {
    return itens.filter((item) => !item.cancelada);
  }

  private pessoas(itens: FaltaResumoEntrada[]): Set<string> {
    return new Set(itens.map((item) => item.codigo).filter(Boolean));
  }

  private reincidentes(itens: FaltaResumoEntrada[]): number {
    const contagem = new Map<string, number>();
    for (const item of itens) {
      if (!item.codigo) continue;
      contagem.set(item.codigo, (contagem.get(item.codigo) ?? 0) + 1);
    }
    return [...contagem.values()].filter((total) => total > 1).length;
  }

  private turnoChave(item: FaltaResumoEntrada): string | null {
    if (!item.setorNome || !item.turnoNome) return null;
    return `${item.setorNome} · ${item.turnoNome}`;
  }

  private concentracao(
    atual: FaltaResumoEntrada[],
    anterior: FaltaResumoEntrada[],
    chave: (item: FaltaResumoEntrada) => string | null,
  ): FaltaConcentracao {
    const lider = this.lider(atual, chave);
    return {
      nome: lider,
      pessoas: this.pessoasDaChave(atual, chave, lider),
      pessoasAnterior: this.pessoasDaChave(anterior, chave, lider),
    };
  }

  private lider(itens: FaltaResumoEntrada[], chave: (item: FaltaResumoEntrada) => string | null): string | null {
    const grupos = new Map<string, Set<string>>();
    for (const item of itens) {
      const nome = chave(item);
      if (!nome || !item.codigo) continue;
      const pessoas = grupos.get(nome) ?? new Set<string>();
      pessoas.add(item.codigo);
      grupos.set(nome, pessoas);
    }
    let nome: string | null = null;
    let total = 0;
    for (const [atual, pessoas] of grupos) {
      if (pessoas.size > total) {
        nome = atual;
        total = pessoas.size;
      }
    }
    return nome;
  }

  private pessoasDaChave(
    itens: FaltaResumoEntrada[],
    chave: (item: FaltaResumoEntrada) => string | null,
    nome: string | null,
  ): number {
    if (!nome) return 0;
    return this.pessoas(itens.filter((item) => chave(item) === nome)).size;
  }
}
