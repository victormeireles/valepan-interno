export const MENSAGEM_PLANO_SEM_NASCIMENTO = 'Informe a data de nascimento para marcar o plano de saúde.';

export class PlanoSaudeNascimento {
  conferir(planoSaude: boolean, nascimento: string | null | undefined): void {
    if (!planoSaude || this.preenchido(nascimento)) return;
    throw new Error(MENSAGEM_PLANO_SEM_NASCIMENTO);
  }

  private preenchido(nascimento: string | null | undefined): boolean {
    if (typeof nascimento !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(nascimento.slice(0, 10));
  }
}
