export class CargoVinculo {
  aceitar(entrada: { ativo: boolean | null; cargoAtualId: string | null; escolhido: string | null }): void {
    if (!entrada.escolhido) return;
    if (entrada.ativo === null) throw new Error('Cargo inválido.');
    if (entrada.ativo) return;
    if (entrada.cargoAtualId === entrada.escolhido) return;
    throw new Error('Este cargo não está disponível.');
  }
}

export class CargoExclusao {
  mensagemSeUsado(quantidade: number): string | null {
    if (quantidade > 0) return 'Este cargo está em uso. Desative para tirá-lo das novas escolhas.';
    return null;
  }
}
