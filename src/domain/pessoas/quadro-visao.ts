export type QuadroLinhaEntrada = {
  setorNome: string;
  turnoNome: string;
  turnoCodigo: string;
  papel: 'ocupacao' | 'reserva' | 'apoio' | null;
};

export type QuadroLinha = {
  setorNome: string;
  turnoNome: string;
  turnoCodigo: string;
  aprovado: number;
  contratados: number;
  reservas: number;
  livres: number;
};

export class QuadroVisao {
  montar(posicoes: { setorNome: string; turnoNome: string; turnoCodigo: string }[], alocacoes: QuadroLinhaEntrada[]): QuadroLinha[] {
    const linhas = new Map<string, QuadroLinha>();
    for (const posicao of posicoes) {
      const linha = this.garantir(linhas, posicao);
      linha.aprovado += 1;
      linha.livres += 1;
    }
    for (const alocacao of alocacoes) {
      if (alocacao.papel === 'apoio' || alocacao.papel === null) continue;
      const linha = linhas.get(alocacao.turnoCodigo);
      if (!linha) continue;
      if (alocacao.papel === 'ocupacao') linha.contratados += 1;
      if (alocacao.papel === 'reserva') linha.reservas += 1;
      linha.livres -= 1;
    }
    return [...linhas.values()];
  }

  private garantir(
    linhas: Map<string, QuadroLinha>,
    posicao: { setorNome: string; turnoNome: string; turnoCodigo: string },
  ): QuadroLinha {
    const atual = linhas.get(posicao.turnoCodigo);
    if (atual) return atual;
    const nova: QuadroLinha = {
      setorNome: posicao.setorNome,
      turnoNome: posicao.turnoNome,
      turnoCodigo: posicao.turnoCodigo,
      aprovado: 0,
      contratados: 0,
      reservas: 0,
      livres: 0,
    };
    linhas.set(posicao.turnoCodigo, nova);
    return nova;
  }
}
