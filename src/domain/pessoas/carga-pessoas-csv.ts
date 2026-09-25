import type { CargaColaborador, CargaSetor } from './carga-pessoas-tipos';
import { CpfVerificador } from './cpf-verificador';
import { NomeCapitalizador } from './nome-capitalizador';

type CsvMapa = Record<string, string>;

/** Campos extras do CSV necessários para upsert (além da prévia). */
export type CargaColaboradorLinha = CargaColaborador & {
  apelido: string | null;
  nascimento: string | null;
  nomeMae: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  cargo: string | null;
  cadastroIncompleto: boolean;
  dataAdmissao: string | null;
  dataDesligamento: string | null;
  observacoes: string | null;
};

export class CargaPessoasCsv {
  private readonly nomes = new NomeCapitalizador();
  private readonly cpfs = new CpfVerificador();

  lerSetores(csv: string): CargaSetor[] {
    return this.linhas(csv).map((row) => this.mapearSetor(row));
  }

  lerColaboradores(csv: string): CargaColaboradorLinha[] {
    return this.linhas(csv).map((row) => this.mapearColaborador(row));
  }

  private mapearSetor(row: CsvMapa): CargaSetor {
    return {
      codigo: row.setor_id?.trim() ?? '',
      nome: this.nomes.formatar(row.nome ?? ''),
      tipo: this.mapearTipo(row.tipo ?? ''),
      agrupamentoProposto: this.ehSim(row.agrupamento_proposto),
    };
  }

  private mapearColaborador(row: CsvMapa): CargaColaboradorLinha {
    const cpf = this.normalizarCpf(row.cpf);
    return {
      codigo: row.colaborador_id?.trim() ?? '',
      nome: this.nomes.formatar(row.nome ?? ''),
      situacao: this.mapearSituacao(row.situacao ?? ''),
      cpf,
      cpfVerificado: cpf !== null && this.cpfs.verificar(cpf),
      setorCodigo: this.ouNulo(row.setor_id),
      turnoCodigo: this.ouNulo(row.turno_id),
      desligamentoDataDesconhecida: this.ehSim(row.desligamento_data_desconhecida),
      apelido: this.ouNulo(row.apelido),
      nascimento: this.ouNulo(row.nascimento),
      nomeMae: this.formatarOpcional(row.nome_mae),
      endereco: this.ouNulo(row.endereco),
      telefone: this.ouNulo(row.telefone),
      email: this.ouNulo(row.email),
      cargo: this.formatarOpcional(row.cargo),
      cadastroIncompleto: this.ehSim(row.cadastro_incompleto),
      dataAdmissao: this.ouNulo(row.data_admissao),
      dataDesligamento: this.ouNulo(row.data_desligamento),
      observacoes: this.ouNulo(row.observacoes),
    };
  }

  private formatarOpcional(valor: string | undefined): string | null {
    const t = this.ouNulo(valor);
    return t === null ? null : this.nomes.formatar(t);
  }

  private mapearTipo(tipo: string): CargaSetor['tipo'] {
    const t = tipo.trim().toLocaleLowerCase('pt-BR');
    if (t === 'apoio e gestão' || t === 'apoio e gestao') return 'apoio';
    return 'operacional';
  }

  private mapearSituacao(situacao: string): CargaColaborador['situacao'] {
    const s = situacao.trim().toLocaleLowerCase('pt-BR');
    if (s === 'admissão prevista' || s === 'admissao prevista') return 'admissao_prevista';
    if (s === 'desligado') return 'desligado';
    return 'ativo';
  }

  private normalizarCpf(valor: string | undefined): string | null {
    const digitos = (valor ?? '').replace(/\D/g, '');
    return digitos.length > 0 ? digitos : null;
  }

  private ouNulo(valor: string | undefined): string | null {
    const t = valor?.trim() ?? '';
    return t.length > 0 ? t : null;
  }

  private ehSim(valor: string | undefined): boolean {
    return (valor ?? '').trim().toLocaleLowerCase('pt-BR') === 'sim';
  }

  private linhas(csv: string): CsvMapa[] {
    const rows = this.dividirLinhas(csv);
    if (rows.length < 2) return [];
    const header = this.parseLinha(rows[0]);
    return rows.slice(1).map((linha) => this.paraMapa(header, this.parseLinha(linha)));
  }

  private dividirLinhas(csv: string): string[] {
    return csv
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);
  }

  private paraMapa(header: string[], valores: string[]): CsvMapa {
    const mapa: CsvMapa = {};
    for (let i = 0; i < header.length; i += 1) {
      mapa[header[i]] = valores[i] ?? '';
    }
    return mapa;
  }

  private parseLinha(linha: string): string[] {
    const out: string[] = [];
    let atual = '';
    let emAspas = false;
    for (let i = 0; i < linha.length; i += 1) {
      const ch = linha[i];
      if (ch === '"') {
        if (emAspas && linha[i + 1] === '"') {
          atual += '"';
          i += 1;
        } else {
          emAspas = !emAspas;
        }
        continue;
      }
      if (ch === ',' && !emAspas) {
        out.push(atual);
        atual = '';
        continue;
      }
      atual += ch;
    }
    out.push(atual);
    return out;
  }
}
