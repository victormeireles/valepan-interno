import type { FolhaPacote } from './folha-balde';
import type { FolhaSituacao } from './folha-resumo';
import type { FolhaVigenciaBruta } from './folha-vigente';
import type { Regime } from './regime-cadastro';

export type FolhaColaboradorBruto = {
  id: string;
  nome: string;
  situacao: FolhaSituacao;
  regime: Regime;
  setorNome: string | null;
  nascimento: string | null;
};

type SetorCatalogo = { nome: string; ordem: number };

export class FolhaLeitura {
  colaboradores(rows: unknown): FolhaColaboradorBruto[] {
    return this.linhas(rows, 'colaboradores').map((row, index) => this.colaborador(row, index));
  }

  vigencias(rows: unknown): FolhaVigenciaBruta[] {
    return this.linhas(rows, 'vigências').map((row, index) => this.vigencia(row, index));
  }

  setores(rows: unknown): SetorCatalogo[] {
    return this.linhas(rows, 'setores').map((row, index) => this.setor(row, index));
  }

  posicoes(rows: unknown): string[] {
    return this.linhas(rows, 'vagas')
      .map((row) => this.nomeRelacao(row.pessoas_setores))
      .filter((nome): nome is string => nome !== null);
  }

  private colaborador(row: Record<string, unknown>, index: number): FolhaColaboradorBruto {
    const id = this.texto(row.id);
    const nome = this.texto(row.nome);
    const situacao = this.situacao(row.situacao);
    if (!id || !nome || !situacao) {
      throw new Error(`Erro ao ler a folha: colaborador ${index} sem id, nome ou situação.`);
    }
    return {
      id,
      nome,
      situacao,
      regime: this.regime(row.regime, index),
      setorNome: this.nomeRelacao(row.pessoas_setores),
      nascimento: this.data(row.nascimento),
    };
  }

  private vigencia(row: Record<string, unknown>, index: number): FolhaVigenciaBruta {
    const colaboradorId = this.texto(row.colaborador_id);
    const inicio = this.texto(row.inicio).slice(0, 10);
    if (!colaboradorId || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
      throw new Error(`Erro ao ler a folha: vigência ${index} inválida.`);
    }
    return { colaboradorId, inicio, ...this.pacote(row) };
  }

  private pacote(row: Record<string, unknown>): FolhaPacote {
    return {
      salarioCentavos: this.centavos(row.salario_centavos, 'salário'),
      valeTransporteCentavos: this.centavos(row.vale_transporte_centavos, 'vale transporte'),
      valeAlimentacaoCentavos: this.centavos(row.vale_alimentacao_centavos, 'vale alimentação'),
      planoSaude: this.plano(row.plano_saude),
    };
  }

  private setor(row: Record<string, unknown>, index: number): SetorCatalogo {
    const nome = this.texto(row.nome);
    if (!nome || typeof row.ordem !== 'number') {
      throw new Error(`Erro ao ler a folha: setor ${index} inválido.`);
    }
    return { nome, ordem: row.ordem };
  }

  private linhas(rows: unknown, origem: string): Record<string, unknown>[] {
    if (!Array.isArray(rows)) throw new Error(`Erro ao ler a folha: ${origem} inválidos.`);
    return rows.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Erro ao ler a folha: linha ${index} de ${origem} inválida.`);
      }
      return row as Record<string, unknown>;
    });
  }

  private situacao(valor: unknown): FolhaSituacao | null {
    if (valor === 'ativo' || valor === 'admissao_prevista' || valor === 'afastado') return valor;
    return null;
  }

  private regime(valor: unknown, index: number): Regime {
    if (valor == null || valor === '') return 'clt';
    if (valor === 'clt' || valor === 'pj') return valor;
    throw new Error(`Erro ao ler a folha: colaborador ${index} com regime inválido.`);
  }

  private nomeRelacao(valor: unknown): string | null {
    if (valor == null) return null;
    const registro = Array.isArray(valor) ? valor[0] : valor;
    if (!registro || typeof registro !== 'object') return null;
    const nome = (registro as { nome?: unknown }).nome;
    return typeof nome === 'string' && nome.trim() ? nome.trim() : null;
  }

  private plano(valor: unknown): boolean {
    if (typeof valor !== 'boolean') throw new Error('Erro ao ler a folha: plano de saúde inválido.');
    return valor;
  }

  private centavos(valor: unknown, campo: string): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
      throw new Error(`Erro ao ler a folha: ${campo} inválido.`);
    }
    return valor;
  }

  private data(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const data = valor.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
  }

  private texto(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim() : '';
  }
}
