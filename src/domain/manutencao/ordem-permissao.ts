type DevolucaoOuFinalizacao = {
  status: 'recebida';
  recebidoPor: string;
  usuarioId: string;
  administra: boolean;
};

type EdicaoFinalizacao = {
  status: 'finalizada';
  recebidoPor: string;
  usuarioId: string;
  administra: boolean;
};

export class OrdemPermissao {
  veDetalhe(veTodas: boolean, setores: string[], setorOrdem: string | null): boolean {
    if (veTodas) return true;
    if (!setorOrdem) return false;
    return setores.includes(setorOrdem);
  }

  devolveOuFinaliza(args: DevolucaoOuFinalizacao): boolean {
    if (args.status !== 'recebida') return false;
    return args.administra || args.recebidoPor === args.usuarioId;
  }

  editaFinalizacao(args: EdicaoFinalizacao): boolean {
    if (args.status !== 'finalizada') return false;
    return args.administra || args.recebidoPor === args.usuarioId;
  }
}
