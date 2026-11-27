export const ALVO_FABRICA = 'fabrica';
export const ROTULO_FABRICA = 'Fábrica';
export const OPCAO_FABRICA_INTEIRA = 'Fábrica inteira';

export type EscopoManutencao = 'maquina' | 'fabrica';

export type AlvoPlano = {
  escopo: EscopoManutencao;
  maquinaId: string | null;
};

export type ColunasAlvoPlano = {
  escopo: EscopoManutencao;
  maquina_id: string | null;
};

export class RotuloAlvoManutencao {
  nome(escopo: string, nomeMaquina: string): string {
    if (escopo === ALVO_FABRICA) return ROTULO_FABRICA;
    return nomeMaquina;
  }
}

export class AlvoDoPlano {
  daEntrada(escopo: string, maquinaId: string): AlvoPlano {
    if (escopo === ALVO_FABRICA) return this.fabrica();
    return this.maquina(maquinaId);
  }

  colunas(alvo: AlvoPlano): ColunasAlvoPlano {
    if (alvo.escopo === ALVO_FABRICA) return { escopo: 'fabrica', maquina_id: null };
    return { escopo: 'maquina', maquina_id: alvo.maquinaId };
  }

  private fabrica(): AlvoPlano {
    return { escopo: 'fabrica', maquinaId: null };
  }

  private maquina(maquinaId: string): AlvoPlano {
    return { escopo: 'maquina', maquinaId: this.texto(maquinaId) };
  }

  private texto(valor: string): string | null {
    const texto = valor.trim();
    return texto || null;
  }
}
