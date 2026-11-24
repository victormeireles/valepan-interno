const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CargoOpcao = { id: string; nome: string };

export class CargoIdentificador {
  exigir(valor: unknown): string {
    const id = this.ouNulo(valor);
    if (!id) throw new Error('Cargo inválido.');
    return id;
  }

  doFormulario(valor: string | undefined): string | null {
    const texto = (valor ?? '').trim();
    if (!texto) return null;
    return this.exigir(texto);
  }

  ouNulo(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim();
    if (!UUID.test(texto)) return null;
    return texto.toLowerCase();
  }
}

export class CargoOpcaoLeitura {
  private readonly ids = new CargoIdentificador();

  parse(row: unknown): CargoOpcao {
    if (!this.registro(row)) throw new Error('Cargo inválido.');
    if (typeof row.nome !== 'string' || !row.nome.trim()) throw new Error('Cargo inválido.');
    return { id: this.ids.exigir(row.id), nome: row.nome };
  }

  parseAll(rows: unknown): CargoOpcao[] {
    if (!Array.isArray(rows)) throw new Error('Cargo inválido.');
    return rows.map((row) => this.parse(row));
  }

  private registro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }
}

export class CargoOpcoesLista {
  montar(opcoes: CargoOpcao[], atual: { cargoId: string | null; cargoNome: string | null }): CargoOpcao[] {
    if (!atual.cargoId || opcoes.some((opcao) => opcao.id === atual.cargoId)) return opcoes;
    return [...opcoes, { id: atual.cargoId, nome: atual.cargoNome?.trim() || 'Cargo' }];
  }
}
