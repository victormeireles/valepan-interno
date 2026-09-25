export type EstadoServico = 'programado' | 'realizado' | 'cancelado';

export type ServicoExtra = {
  valorExtraCentavos: number;
  precisaPassagem: boolean;
  valorPassagemCentavos: number | null;
  inicio: string;
  fim: string;
  estado: EstadoServico;
};

export class ExtraServico {
  totalCentavos(servico: ServicoExtra): number | null {
    if (servico.valorExtraCentavos < 0) throw new Error('O valor do extra não pode ser negativo.');
    if (!servico.precisaPassagem) return servico.valorExtraCentavos;
    if (servico.valorPassagemCentavos === null) return null;
    if (servico.valorPassagemCentavos < 0) throw new Error('O valor da passagem não pode ser negativo.');
    return servico.valorExtraCentavos + servico.valorPassagemCentavos;
  }

  podePagar(servico: ServicoExtra): boolean {
    return servico.estado === 'realizado' && this.totalCentavos(servico) !== null;
  }

  horarioValido(inicio: string, fim: string): boolean {
    return new Date(fim).getTime() > new Date(inicio).getTime();
  }
}
