import type { CargaColaboradorLinha } from './carga-pessoas-csv';

/**
 * Monta a linha de `pessoas_colaboradores` gravada pela carga.
 * Não inclui regime, CNPJ nem razão social: na inserção valem os defaults
 * do banco (`clt`) e na atualização esses campos não são sobrescritos.
 */
export class CargaColaboradorUpsert {
  montar(
    linha: CargaColaboradorLinha,
    setorId: string | null,
    turnoId: string | null,
    atualizadoEm: string,
  ): Record<string, unknown> {
    return {
      codigo: linha.codigo,
      nome: linha.nome,
      apelido: linha.apelido,
      nascimento: linha.nascimento,
      nome_mae: linha.nomeMae,
      cpf: linha.cpf,
      cpf_verificado: linha.cpfVerificado,
      endereco: linha.endereco,
      telefone: linha.telefone,
      email: linha.email,
      cargo: linha.cargo,
      situacao: linha.situacao,
      cadastro_incompleto: linha.cadastroIncompleto,
      setor_id: setorId,
      turno_id: turnoId,
      data_admissao: linha.dataAdmissao,
      data_desligamento: linha.dataDesligamento,
      desligamento_data_desconhecida: linha.desligamentoDataDesconhecida,
      observacoes: linha.observacoes,
      updated_at: atualizadoEm,
    };
  }
}
