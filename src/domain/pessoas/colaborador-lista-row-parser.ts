import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';

const SITUACOES = new Set<ColaboradorListaItem['situacao']>([
  'ativo',
  'admissao_prevista',
  'desligado',
]);

export class ColaboradorListaRowParser {
  parseAll(rows: unknown): ColaboradorListaItem[] {
    if (rows == null) return [];
    if (!Array.isArray(rows)) {
      throw new Error('Erro ao listar colaboradores: resposta inválida.');
    }
    return rows.map((row, index) => this.parseRow(row, index));
  }

  parseRow(row: unknown, index: number): ColaboradorListaItem {
    if (!this.isRecord(row)) {
      throw new Error(`Erro ao listar colaboradores: linha ${index} inválida.`);
    }

    const codigo = this.lerTexto(row.codigo);
    const nome = this.lerTexto(row.nome);
    const situacao = this.lerSituacao(row.situacao);
    if (!codigo || !nome || !situacao) {
      throw new Error(
        `Erro ao listar colaboradores: linha ${index} sem codigo, nome ou situacao válidos.`,
      );
    }

    return {
      codigo,
      nome,
      situacao,
      setorNome: this.lerNomeRelacao(row.pessoas_setores),
      turnoNome: this.lerNomeRelacao(row.pessoas_turnos),
    };
  }

  private lerSituacao(valor: unknown): ColaboradorListaItem['situacao'] | null {
    if (typeof valor !== 'string') return null;
    if (!SITUACOES.has(valor as ColaboradorListaItem['situacao'])) return null;
    return valor as ColaboradorListaItem['situacao'];
  }

  private lerNomeRelacao(valor: unknown): string | null {
    if (valor == null) return null;
    const registro = Array.isArray(valor) ? valor[0] : valor;
    if (!this.isRecord(registro)) {
      throw new Error('Erro ao listar colaboradores: relação setor/turno inválida.');
    }
    const nome = registro.nome;
    if (nome == null) return null;
    if (typeof nome !== 'string') {
      throw new Error('Erro ao listar colaboradores: nome de setor/turno inválido.');
    }
    return nome;
  }

  private lerTexto(valor: unknown): string | null {
    return typeof valor === 'string' && valor.trim() ? valor : null;
  }

  private isRecord(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }
}
