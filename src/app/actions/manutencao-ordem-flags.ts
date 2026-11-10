import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { ManutencaoSetoresPorModulo } from '@/domain/manutencao/manutencao-setores-por-modulo';
import { OrdemCancelamento } from '@/domain/manutencao/ordem-cancelamento';
import { OrdemPermissao } from '@/domain/manutencao/ordem-permissao';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { OrdemLeitura } from './manutencao-ordem-leitura';

const MOTIVO_SONDA = 'motivo';

type OrdemParaFlags = {
  status: string;
  tipo: string;
  setor_id: string;
  recebida_por: string | null;
};

export type FlagsOrdem = {
  podeReceber: boolean;
  podeDevolver: boolean;
  podeFinalizar: boolean;
  podeEditarFinalizacao: boolean;
  podeCancelar: boolean;
  podeExcluir: boolean;
  exigeMotivo: boolean;
};

export class FlagsDaOrdem {
  async setoresDoSolicitante(
    leitura: OrdemLeitura,
    snap: UsuarioAuthzSnapshot,
  ): Promise<string[]> {
    if (new ManutencaoAcesso().executaOficina(snap)) return [];
    const codigos = new ManutencaoSetoresPorModulo().codigosElegiveis(snap);
    return leitura.setoresPorCodigos(codigos);
  }

  calcular(
    ordem: OrdemParaFlags,
    snap: UsuarioAuthzSnapshot,
    usuarioId: string,
    setores: readonly string[],
  ): FlagsOrdem {
    const acesso = new ManutencaoAcesso();
    const podeConcluir = this.podeDevolverOuFinalizar(ordem, snap, usuarioId);
    const cancelamento = this.decisaoCancelamento(ordem, snap, setores);
    return {
      podeReceber: ordem.status === 'aberta' && acesso.executaOficina(snap),
      podeDevolver: podeConcluir,
      podeFinalizar: podeConcluir,
      podeEditarFinalizacao: this.liberaEdicaoFinalizacao(ordem, snap, usuarioId),
      podeCancelar: cancelamento?.ok === true,
      podeExcluir: acesso.administra(snap),
      exigeMotivo: cancelamento?.ok === true && cancelamento.exigeMotivo,
    };
  }

  private podeDevolverOuFinalizar(
    ordem: OrdemParaFlags,
    snap: UsuarioAuthzSnapshot,
    usuarioId: string,
  ): boolean {
    if (ordem.status !== 'recebida' || !ordem.recebida_por) return false;
    return new OrdemPermissao().devolveOuFinaliza({
      status: 'recebida',
      recebidoPor: ordem.recebida_por,
      usuarioId,
      administra: new ManutencaoAcesso().administra(snap),
    });
  }

  private liberaEdicaoFinalizacao(
    ordem: OrdemParaFlags,
    snap: UsuarioAuthzSnapshot,
    usuarioId: string,
  ): boolean {
    if (ordem.status !== 'finalizada' || !ordem.recebida_por) return false;
    return new OrdemPermissao().editaFinalizacao({
      status: 'finalizada',
      recebidoPor: ordem.recebida_por,
      usuarioId,
      administra: new ManutencaoAcesso().administra(snap),
    });
  }

  private decisaoCancelamento(
    ordem: OrdemParaFlags,
    snap: UsuarioAuthzSnapshot,
    setores: readonly string[],
  ) {
    const tipo = this.tipoOrdem(ordem.tipo);
    if (!tipo) return null;
    const acesso = new ManutencaoAcesso();
    return new OrdemCancelamento().permite({
      status: ordem.status,
      tipo,
      solicitacaoEditar: acesso.abreCorretiva(snap),
      manutencaoEditar: acesso.executaOficina(snap),
      manutencaoAdministrar: acesso.administra(snap),
      motivo: MOTIVO_SONDA,
      setorId: ordem.setor_id,
      setoresElegiveis: setores,
    });
  }

  private tipoOrdem(valor: string): 'corretiva' | 'preventiva' | null {
    if (valor === 'corretiva' || valor === 'preventiva') return valor;
    return null;
  }
}
