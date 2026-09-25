import { CargaPessoasCampoInvalidoError } from './carga-pessoas-campo-invalido-error';
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
  noQuadro: boolean;
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
    const codigo = row.setor_id?.trim() ?? '';
    return {
      codigo,
      nome: this.nomes.formatar(row.nome ?? ''),
      tipo: this.mapearTipo(row.tipo ?? '', codigo),
      agrupamentoProposto: this.ehSim(row.agrupamento_proposto),
    };
  }

  private mapearColaborador(row: CsvMapa): CargaColaboradorLinha {
    const codigo = row.colaborador_id?.trim() ?? '';
    const cpf = this.normalizarCpf(row.cpf);
    return {
      codigo,
      nome: this.nomes.formatar(row.nome ?? ''),
      situacao: this.mapearSituacao(row.situacao ?? '', codigo),
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
      noQuadro: this.ehSim(row.no_quadro_operacional),
    };
  }

  private formatarOpcional(valor: string | undefined): string | null {
    const t = this.ouNulo(valor);
    return t === null ? null : this.nomes.formatar(t);
  }

  private mapearTipo(tipo: string, codigo: string): CargaSetor['tipo'] {
    const t = tipo.trim().toLocaleLowerCase('pt-BR');
    if (t === 'operacional') return 'operacional';
    if (t === 'apoio e gestão' || t === 'apoio e gestao') return 'apoio';
    throw new CargaPessoasCampoInvalidoError(codigo, 'tipo desconhecido');
  }

  private mapearSituacao(situacao: string, codigo: string): CargaColaborador['situacao'] {
    const s = situacao.trim().toLocaleLowerCase('pt-BR');
    if (s === 'ativo') return 'ativo';
    if (s === 'admissão prevista' || s === 'admissao prevista') return 'admissao_prevista';
    if (s === 'desligado') return 'desligado';
    throw new CargaPessoasCampoInvalidoError(codigo, 'situacao desconhecida');
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
