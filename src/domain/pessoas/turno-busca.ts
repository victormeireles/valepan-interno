export type TurnoBuscaItem = {
  codigo: string;
  nome: string;
  setorNome: string;
};

export class TurnoBusca {
  listar(turnos: TurnoBuscaItem[], termo: string): TurnoBuscaItem[] {
    const termos = normalizar(termo).split(/\s+/).filter(Boolean);
    return [...turnos]
      .sort((a, b) => a.setorNome.localeCompare(b.setorNome, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))
      .filter((turno) => {
        const rotulo = normalizar(`${turno.setorNome} ${turno.nome}`);
        return termos.every((parte) => rotulo.includes(parte));
      });
  }
}

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
