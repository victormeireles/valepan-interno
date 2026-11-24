import { RemuneracaoCentavos } from './remuneracao-centavos';
import { CargoNome } from './cargo-nome';
import { CargoIdentificador } from './cargo-opcao';

export type CargoFaixaEntrada = {
  nome: string;
  deCentavos: number;
  ateCentavos: number;
};

export type CargoCadastro = CargoFaixaEntrada & {
  id: string;
  ativo: boolean;
};

export class CargoFaixaNormalizador {
  private readonly centavos = new RemuneracaoCentavos();
  private readonly nomes = new CargoNome();

  normalizar(entrada: { nome?: string; de?: string; ate?: string }): CargoFaixaEntrada {
    const nome = this.nomes.exigir(entrada.nome ?? '');
    const deCentavos = this.centavos.interpretar(
      entrada.de,
      'Informe o valor inicial da faixa.',
      'Valor inicial alto demais.',
    );
    const ateCentavos = this.centavos.interpretar(
      entrada.ate,
      'Informe o valor final da faixa.',
      'Valor final alto demais.',
    );
    if (ateCentavos < deCentavos) throw new Error('O valor final precisa ser maior ou igual ao inicial.');
    return { nome, deCentavos, ateCentavos };
  }
}

export class CargoFaixaLeitura {
  private readonly ids = new CargoIdentificador();

  parse(row: unknown): CargoCadastro {
    if (!this.registro(row)) throw new Error('Cargo inválido.');
    const id = this.ids.exigir(row.id);
    if (typeof row.nome !== 'string' || !row.nome.trim()) throw new Error('Cargo inválido.');
    if (typeof row.ativo !== 'boolean') throw new Error('Cargo inválido.');
    const deCentavos = this.centavos(row.de_centavos);
    const ateCentavos = this.centavos(row.ate_centavos);
    if (ateCentavos < deCentavos) throw new Error('Cargo inválido.');
    return { id, nome: row.nome, deCentavos, ateCentavos, ativo: row.ativo };
  }

  parseAll(rows: unknown): CargoCadastro[] {
    if (!Array.isArray(rows)) throw new Error('Cargo inválido.');
    return rows.map((row) => this.parse(row));
  }

  private centavos(valor: unknown): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) throw new Error('Cargo inválido.');
    return valor;
  }

  private registro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }
}

export class CargoFaixaRotulo {
  private readonly centavos = new RemuneracaoCentavos();

  exibir(deCentavos: number, ateCentavos: number): string {
    return `De ${this.centavos.formatar(deCentavos)} até ${this.centavos.formatar(ateCentavos)}`;
  }
}
