type EtiquetaTituloInput = {
  nome: string;
  familiaNome?: string | null;
  nomeEtiqueta?: string | null;
};

export class EtiquetaTituloManager {
  resolve(produto: EtiquetaTituloInput, tituloEditado?: string): string {
    const titulo = tituloEditado?.trim()
      || produto.familiaNome?.trim()
      || produto.nomeEtiqueta?.trim()
      || produto.nome;
    return titulo.trim().replace(/\s+/g, ' ');
  }

  split(titulo: string): { prefixo: string; destaque: string } {
    const palavras = titulo.trim().split(/\s+/);
    const destaque = palavras.pop() ?? '';
    return { prefixo: palavras.join(' '), destaque };
  }
}
