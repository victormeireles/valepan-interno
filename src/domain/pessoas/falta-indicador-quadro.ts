export type FaltaLeituraQuadro = {
  valor: string;
  rotulo: string;
};

export class FaltaIndicadorQuadro {
  participacao(parte: number, total: number): FaltaLeituraQuadro {
    return { valor: this.percentual(parte, total), rotulo: 'do total' };
  }

  media(faltas: number, total: number): FaltaLeituraQuadro {
    return { valor: this.mediaTexto(faltas, total), rotulo: 'por pessoa' };
  }

  private percentual(parte: number, total: number): string {
    if (total <= 0) return '—';
    const pontos = Math.round((parte / total) * 100);
    if (pontos === 0 && parte > 0) return '<1%';
    return `${pontos.toLocaleString('pt-BR')}%`;
  }

  private mediaTexto(faltas: number, total: number): string {
    if (total <= 0) return '—';
    return (faltas / total).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
