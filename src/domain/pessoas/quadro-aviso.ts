import type { Regime } from './regime-cadastro';
import { RegimeTroca } from './regime-troca';

export type QuadroAvisoPessoa = {
  papel?: string;
  avisoAtivo?: boolean;
  regime?: Regime;
  dataDesligamento?: string | null;
};

export class QuadroAviso {
  pendente(pessoa: QuadroAvisoPessoa): boolean {
    if (pessoa.avisoAtivo) return true;
    return new RegimeTroca().saidaPrevista(pessoa.regime ?? 'clt', 'ativo', pessoa.dataDesligamento ?? null);
  }

  ocupaVaga(pessoa: QuadroAvisoPessoa): boolean {
    return pessoa.papel === 'ocupacao' && this.pendente(pessoa);
  }

  rotulo(pessoa: QuadroAvisoPessoa): string | null {
    if (pessoa.avisoAtivo) return 'Em aviso';
    if (new RegimeTroca().saidaPrevista(pessoa.regime ?? 'clt', 'ativo', pessoa.dataDesligamento ?? null)) {
      return 'Saída prevista';
    }
    return null;
  }
}
