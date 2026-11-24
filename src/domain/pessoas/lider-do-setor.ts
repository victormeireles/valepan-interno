export type PessoaDoSetor = {
  nome: string;
  setorNome: string | null;
  liderSetor: boolean;
  situacao: string;
};

export class LiderDoSetor {
  porSetor(pessoas: PessoaDoSetor[]): Map<string, string> {
    const nomes = new Map<string, string[]>();
    for (const pessoa of pessoas) {
      if (!pessoa.liderSetor || !pessoa.setorNome || pessoa.situacao === 'desligado') continue;
      const lista = nomes.get(pessoa.setorNome) ?? [];
      lista.push(pessoa.nome);
      nomes.set(pessoa.setorNome, lista);
    }
    return new Map([...nomes.entries()].map(([setor, lista]) => [setor, lista.join(', ')]));
  }
}
