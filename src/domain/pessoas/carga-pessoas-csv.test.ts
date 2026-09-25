import { describe, expect, it } from 'vitest';
import { CargaPessoasCampoInvalidoError } from './carga-pessoas-campo-invalido-error';
import { CargaPessoasCsv } from './carga-pessoas-csv';

const CABECALHO_COLABORADORES =
  'colaborador_id,nome,apelido,situacao,cadastro_incompleto,nascimento,nome_mae,cpf,endereco,telefone,email,cargo,setor_id,turno_id,no_quadro_operacional,data_admissao,data_desligamento,desligamento_data_desconhecida,observacoes';

function linhaColaborador(situacao = 'Ativo'): string {
  return [
    CABECALHO_COLABORADORES,
    `VP-9001,maria da silva,,${situacao},Não,,,,"",,,,PRO,PRO-M,Não,,,Não,`,
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

  it('rejeita tipo de setor desconhecido sem inventar operacional', () => {
    const leitor = new CargaPessoasCsv();
    expect(() =>
      leitor.lerSetores(
        'setor_id,nome,tipo,agrupamento_proposto\nPRO,Produção,Fantasia,Não\n',
      ),
    ).toThrow(CargaPessoasCampoInvalidoError);
    try {
      leitor.lerSetores(
        'setor_id,nome,tipo,agrupamento_proposto\nPRO,Produção,Fantasia,Não\n',
      );
    } catch (err) {
      expect(err).toMatchObject({ codigo: 'PRO', motivo: 'tipo desconhecido' });
    }
  });

  it('rejeita situacao desconhecida sem inventar ativo', () => {
    const leitor = new CargaPessoasCsv();
    expect(() => leitor.lerColaboradores(linhaColaborador('Licenca'))).toThrow(
      CargaPessoasCampoInvalidoError,
    );
    try {
      leitor.lerColaboradores(linhaColaborador('Licenca'));
    } catch (err) {
      expect(err).toMatchObject({ codigo: 'VP-9001', motivo: 'situacao desconhecida' });
    }
  });
});
