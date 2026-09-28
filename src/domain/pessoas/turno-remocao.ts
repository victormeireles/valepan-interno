type PessoaApoio = { nome: string; turnoCodigo: string };

export class TurnoRemocao {
  ocupadas(contratados: number, reservas: number): number {
    return contratados + reservas;
  }

  nomesApoio(apoio: PessoaApoio[], turnoCodigo: string): string[] {
    return apoio.filter((pessoa) => pessoa.turnoCodigo === turnoCodigo).map((pessoa) => pessoa.nome);
  }

  avisoApoio(nomes: string[]): string | null {
    const lista = this.listar(nomes);
    if (!lista) return null;
    const verbo = nomes.length === 1 ? 'está como apoio neste turno e sai' : 'estão como apoio neste turno e saem';
    return `${lista} ${verbo} do quadro.`;
  }

  private listar(nomes: string[]): string | null {
    if (nomes.length === 0) return null;
    if (nomes.length === 1) return nomes[0] ?? null;
    const ultimo = nomes[nomes.length - 1];
    return `${nomes.slice(0, -1).join(', ')} e ${ultimo}`;
  }
}
