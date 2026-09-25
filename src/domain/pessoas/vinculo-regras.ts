export type PapelAlocacao = 'ocupacao' | 'reserva' | 'apoio';

export type AlocacaoAberta = {
  papel: PapelAlocacao;
  posicaoCodigo: string | null;
  turnoCodigo: string;
};

export type VagaLivre = { codigo: string; turnoCodigo: string; operacional: boolean };

export class VinculoRegras {
  admitir(alocacao: AlocacaoAberta | null): { papel: 'ocupacao' } {
    if (!alocacao || alocacao.papel !== 'reserva' || !alocacao.posicaoCodigo) {
      throw new Error('Só uma reserva em vaga pode virar admissão.');
    }
    return { papel: 'ocupacao' };
  }

  desistir(alocacao: AlocacaoAberta | null): { encerraReserva: true } {
    if (!alocacao || alocacao.papel !== 'reserva') {
      throw new Error('Não há reserva ativa para desistir.');
    }
    return { encerraReserva: true };
  }

  transferir(alocacao: AlocacaoAberta | null, vagas: VagaLivre[], turnoCodigo: string): VagaLivre | null {
    if (!alocacao) throw new Error('A pessoa não tem alocação aberta.');
    const doTurno = vagas.filter((v) => v.turnoCodigo === turnoCodigo);
    const operacional = doTurno.some((v) => v.operacional) || doTurno.length === 0;
    if (!operacional) return null;
    const livre = doTurno.find((v) => v.operacional);
    if (!livre) throw new Error('Sem vaga livre nesse turno.');
    return livre;
  }

  desligar(data: string, hoje: string, tipo: string): { data: string; futuro: boolean; tipo: 'com_trabalho' | 'sem_trabalho' } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Informe a data do desligamento.');
    if (tipo !== 'com_trabalho' && tipo !== 'sem_trabalho') {
      throw new Error('Informe se o aviso é com ou sem trabalho.');
    }
    return { data, futuro: data > hoje, tipo };
  }
}
