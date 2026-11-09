export class FilaFundacao {
  mensagem(veTodas: boolean, setoresValidos: number): string {
    if (!veTodas && setoresValidos === 0) return 'Nenhum setor liberado.';
    return 'Nenhuma ordem.';
  }
}
