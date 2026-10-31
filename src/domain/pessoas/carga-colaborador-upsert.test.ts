import { describe, expect, it } from 'vitest';
import { CargaColaboradorUpsert } from './carga-colaborador-upsert';
import type { CargaColaboradorLinha } from './carga-pessoas-csv';

const linha: CargaColaboradorLinha = {
  codigo: 'VP-1',
  nome: 'Ana',
  situacao: 'ativo',
  cpf: null,
  cpfVerificado: false,
  setorCodigo: 'PRO',
  turnoCodigo: 'PRO-M',
  desligamentoDataDesconhecida: false,
  apelido: null,
  nascimento: null,
  nomeMae: null,
  endereco: null,
  telefone: null,
  email: null,
  cargo: null,
  cadastroIncompleto: false,
  dataAdmissao: null,
  dataDesligamento: null,
  observacoes: null,
  noQuadro: true,
};

describe('CargaColaboradorUpsert', () => {
  it('grava a pessoa sem regime, CNPJ ou razão social', () => {
    const row = new CargaColaboradorUpsert().montar(linha, 'setor', 'turno', '2026-10-31T00:00:00.000Z');
    expect(Object.keys(row).sort()).toEqual([
      'apelido',
      'cadastro_incompleto',
      'cargo',
      'codigo',
      'cpf',
      'cpf_verificado',
      'data_admissao',
      'data_desligamento',
      'desligamento_data_desconhecida',
      'email',
      'endereco',
      'nascimento',
      'nome',
      'nome_mae',
      'observacoes',
      'setor_id',
      'situacao',
      'telefone',
      'turno_id',
      'updated_at',
    ]);
    expect(row.setor_id).toBe('setor');
    expect(row.turno_id).toBe('turno');
    expect(row.updated_at).toBe('2026-10-31T00:00:00.000Z');
  });
});
