type PedidoCancelamento = {
  status: string;
  tipo: 'corretiva' | 'preventiva';
  solicitacaoEditar: boolean;
  manutencaoEditar: boolean;
  manutencaoAdministrar: boolean;
  motivo: string;
};

type ResultadoCancelamento = { ok: true; exigeMotivo: boolean } | { ok: false; mensagem: string };

const STATUS_ABERTO = 'aberta';
const STATUS_RECEBIDO = 'recebida';

export class OrdemCancelamento {
  permite(args: PedidoCancelamento): ResultadoCancelamento {
    const encerrada = this.encerrada(args.status);
    if (encerrada) return encerrada;
    if (args.manutencaoAdministrar) return this.comoAdministrador(args);
    if (args.manutencaoEditar) return this.comoOficina(args);
    if (args.solicitacaoEditar) return this.comoSolicitante(args);
    return this.recusar('Sem permissão para cancelar.');
  }

  private encerrada(status: string): ResultadoCancelamento | null {
    if (status === 'finalizada') return this.recusar('Ordem finalizada não cancela.');
    if (status === 'cancelada') return this.recusar('Ordem cancelada não cancela.');
    return null;
  }

  private comoAdministrador(args: PedidoCancelamento): ResultadoCancelamento {
    if (!this.statusCancelavel(args.status)) return this.recusar('Sem permissão para cancelar.');
    if (!args.motivo.trim()) return this.recusar('Informe o motivo.');
    return { ok: true, exigeMotivo: true };
  }

  private comoOficina(args: PedidoCancelamento): ResultadoCancelamento {
    if (args.status === STATUS_ABERTO) return { ok: true, exigeMotivo: false };
    return this.recusar('Só quem administra cancela ordem recebida.');
  }

  private comoSolicitante(args: PedidoCancelamento): ResultadoCancelamento {
    if (args.tipo === 'preventiva') return this.recusar('Solicitante não cancela preventiva.');
    if (args.status === STATUS_ABERTO) return { ok: true, exigeMotivo: false };
    return this.recusar('Solicitante só cancela corretiva aberta.');
  }

  private statusCancelavel(status: string): boolean {
    return status === STATUS_ABERTO || status === STATUS_RECEBIDO;
  }

  private recusar(mensagem: string): ResultadoCancelamento {
    return { ok: false, mensagem };
  }
}
