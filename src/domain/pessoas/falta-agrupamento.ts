export type FaltaAgrupavel = {
  codigo: string;
  nome: string;
  cancelada: boolean;
  setorNome: string | null;
  turnoNome: string | null;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  avisoAtivo: boolean;
};

export type FaltaPessoaLinha = {
  codigo: string;
  nome: string;
  faltas: number;
  setorNome: string | null;
  turnoNome: string | null;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  avisoAtivo: boolean;
};

export class FaltaAgrupamento {
  porPessoa(itens: FaltaAgrupavel[]): FaltaPessoaLinha[] {
    const mapa = new Map<string, FaltaPessoaLinha>();
    for (const item of itens) {
      if (item.cancelada || !item.codigo) continue;
      const atual = mapa.get(item.codigo);
      if (atual) {
        atual.faltas += 1;
        continue;
      }
      mapa.set(item.codigo, {
        codigo: item.codigo,
        nome: item.nome,
        faltas: 1,
        setorNome: item.setorNome,
        turnoNome: item.turnoNome,
        situacao: item.situacao,
        avisoAtivo: item.avisoAtivo,
      });
    }
    return [...mapa.values()].sort((a, b) => b.faltas - a.faltas || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
