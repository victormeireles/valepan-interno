import { describe, expect, it } from 'vitest';
import { CargaPessoasCsv } from './carga-pessoas-csv';

const CABECALHO_COLABORADORES =
  'colaborador_id,nome,apelido,situacao,cadastro_incompleto,nascimento,nome_mae,cpf,endereco,telefone,email,cargo,setor_id,turno_id,no_quadro_operacional,data_admissao,data_desligamento,desligamento_data_desconhecida,observacoes';

function linhaColaborador(): string {
  return [
    CABECALHO_COLABORADORES,
    'VP-9001,maria da silva,,Ativo,Não,,,,"",,,,PRO,PRO-M,Não,,,Não,',
  ].join('\n');
}

describe('CargaPessoasCsv', () => {
  it('lê setores e colaboradores do CSV', () => {
    const leitor = new CargaPessoasCsv();
    expect(
      leitor.lerSetores(
        'setor_id,nome,tipo,agrupamento_proposto\nPRO,Produção,Operacional,Não\n',
      ),
    ).toEqual([
      {
        codigo: 'PRO',
        nome: 'Produção',
        tipo: 'operacional',
        agrupamentoProposto: false,
      },
    ]);
    expect(leitor.lerColaboradores(linhaColaborador())[0]).toMatchObject({
      codigo: 'VP-9001',
      nome: 'Maria da Silva',
      situacao: 'ativo',
      setorCodigo: 'PRO',
      turnoCodigo: 'PRO-M',
      cpfVerificado: false,
      desligamentoDataDesconhecida: false,
    });
  });
});
