export type SetorLinha = {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
};

export class SetorOperacional {
  elegivel(setor: { tipo: string; ativo: boolean }): boolean {
    return setor.tipo === 'operacional' && setor.ativo === true;
  }

  filtrar(setores: SetorLinha[]): SetorLinha[] {
    return setores.filter((setor) => this.elegivel(setor));
  }
}
