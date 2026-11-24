import { extractCalendarDate } from '@/lib/utils/date-utils';
import { AfastamentoRotulo } from './afastamento';
import type { ColaboradorPlanilhaOrigem } from './colaborador-planilha';
import type { SituacaoColaborador } from './situacao-colaborador';

const SITUACOES = new Set<SituacaoColaborador>(['ativo', 'admissao_prevista', 'desligado', 'afastado']);

export class ColaboradorPlanilhaRowParser {
  parseAll(rows: unknown): ColaboradorPlanilhaOrigem[] {
    if (rows == null) return [];
    if (!Array.isArray(rows)) throw new Error('Erro ao exportar colaboradores: resposta inválida.');
    return rows.map((row, index) => this.parseRow(row, index));
  }

  parseRow(row: unknown, index: number): ColaboradorPlanilhaOrigem {
    if (!registro(row)) throw new Error(`Erro ao exportar colaboradores: linha ${index} inválida.`);
    const codigo = texto(row.codigo);
    const nome = texto(row.nome);
    const situacao = this.situacao(row.situacao);
    if (!codigo || !nome || !situacao) {
      throw new Error(`Erro ao exportar colaboradores: linha ${index} sem codigo, nome ou situacao válidos.`);
    }
    return {
      codigo,
      nome,
      setorNome: nomeRelacao(row.pessoas_setores),
      turnoNome: nomeRelacao(row.pessoas_turnos),
      dataAdmissao: this.data(row.data_admissao),
      situacao,
      afastamento: new AfastamentoRotulo().ler(row.afastamento),
      avisoAtivo: false,
      liderSetor: row.lider_setor === true,
    };
  }

  private situacao(valor: unknown): SituacaoColaborador | null {
    if (typeof valor !== 'string' || !SITUACOES.has(valor as SituacaoColaborador)) return null;
    return valor as SituacaoColaborador;
  }

  private data(valor: unknown): string | null {
    const iso = extractCalendarDate(valor);
    return iso || null;
  }
}

function nomeRelacao(valor: unknown): string | null {
  if (valor == null) return null;
  const item = Array.isArray(valor) ? valor[0] : valor;
  if (!registro(item)) throw new Error('Erro ao exportar colaboradores: relação setor/turno inválida.');
  return texto(item.nome);
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor : null;
}

function registro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
