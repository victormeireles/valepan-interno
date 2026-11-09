import { SetorOperacional, type SetorLinha } from './setor-operacional';

const MENSAGEM_INELEGIVEL = 'Escolha apenas setores operacionais ativos.';

export type ResultadoSolicitanteSetores =
  | { ok: true; ids: string[] }
  | { ok: false; mensagem: string };

export class SolicitanteSetores {
  constructor(private readonly operacionais = new SetorOperacional()) {}

  filtrar(ids: string[], setores: SetorLinha[]): ResultadoSolicitanteSetores {
    const aceitos: string[] = [];
    const vistos = new Set<string>();

    for (const id of ids) {
      if (vistos.has(id)) continue;
      if (!this.aceita(id, setores)) {
        return { ok: false, mensagem: MENSAGEM_INELEGIVEL };
      }
      vistos.add(id);
      aceitos.push(id);
    }

    return { ok: true, ids: aceitos };
  }

  private aceita(id: string, setores: SetorLinha[]): boolean {
    const setor = setores.find((item) => item.id === id);
    return setor !== undefined && this.operacionais.elegivel(setor);
  }
}
