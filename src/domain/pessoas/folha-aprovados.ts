export type FolhaSetorAprovado = {
  nome: string;
  ordem: number;
  aprovado: number;
};

export class FolhaAprovados {
  montar(catalogo: { nome: string; ordem: number }[], nomesPosicao: string[]): FolhaSetorAprovado[] {
    const mapa = new Map<string, FolhaSetorAprovado>();
    for (const item of catalogo) {
      const nome = item.nome.trim();
      if (!nome) continue;
      mapa.set(nome, { nome, ordem: item.ordem, aprovado: 0 });
    }
    for (const bruto of nomesPosicao) {
      const nome = bruto.trim();
      if (!nome) continue;
      const atual = mapa.get(nome) ?? { nome, ordem: 9_000, aprovado: 0 };
      atual.aprovado += 1;
      mapa.set(nome, atual);
    }
    return [...mapa.values()];
  }
}
