export class FaltaComparativoPercentual {
  texto(atual: number, anterior: number): string {
    if (atual === anterior) return 'Igual ao mês anterior';
    if (anterior <= 0) return 'Sem mês anterior';
    const pontos = Math.round(((atual - anterior) / anterior) * 100);
    if (pontos === 0) return this.fracao(atual > anterior);
    return `${this.sinal(pontos)}${Math.abs(pontos).toLocaleString('pt-BR')}% vs mês anterior`;
  }

  private fracao(subiu: boolean): string {
    return `${subiu ? '+' : '−'}<1% vs mês anterior`;
  }

  private sinal(pontos: number): string {
    return pontos > 0 ? '+' : '−';
  }
}
