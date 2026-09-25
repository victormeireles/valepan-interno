export type CargaSetor = {
  codigo: string;
  nome: string;
  tipo: 'operacional' | 'apoio';
  agrupamentoProposto: boolean;
};
export type CargaTurno = { codigo: string; setorCodigo: string; nome: string; operacional: boolean };
export type CargaColaborador = {
  codigo: string;
  nome: string;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  cpf: string | null;
  cpfVerificado: boolean;
  setorCodigo: string | null;
  turnoCodigo: string | null;
  desligamentoDataDesconhecida: boolean;
};
export type CargaPrevia = {
  inserir: string[];
  atualizar: string[];
  erros: { codigo: string; motivo: string }[];
};
