import { AfastamentoRotulo, type MotivoAfastamento } from './afastamento';

export type SituacaoColaborador = 'ativo' | 'admissao_prevista' | 'desligado' | 'afastado';

export type TomSituacao = 'success' | 'warning' | 'neutral';

export class SituacaoColaboradorRotulo {
  exibir(
    situacao: SituacaoColaborador,
    avisoAtivo: boolean,
    afastamento?: MotivoAfastamento | null,
  ): { texto: string; tom: TomSituacao } {
    if (avisoAtivo && situacao === 'ativo') return { texto: 'Em aviso', tom: 'warning' };
    if (situacao === 'afastado') return { texto: new AfastamentoRotulo().exibir(afastamento), tom: 'warning' };
    if (situacao === 'admissao_prevista') return { texto: 'Admissão prevista', tom: 'warning' };
    if (situacao === 'desligado') return { texto: 'Desligado', tom: 'neutral' };
    return { texto: 'Ativo', tom: 'success' };
  }
}
