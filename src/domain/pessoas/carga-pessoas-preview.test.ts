import { describe, expect, it } from 'vitest';
import { CargaPessoasPreview } from './carga-pessoas-preview';

describe('CargaPessoasPreview', () => {
  it('prevê inserção sem duplicar código e reporta erros de setor', () => {
    const result = new CargaPessoasPreview().prever({
      setores: [{ codigo: 'PRO', nome: 'Produção', tipo: 'operacional', agrupamentoProposto: false }],
      turnos: [{ codigo: 'PRO-M', setorCodigo: 'PRO', nome: 'Manhã', operacional: true }],
      colaboradores: [
        {
          codigo: 'VP-9001',
          nome: 'Pessoa Teste',
          situacao: 'ativo',
          cpf: '52998224725',
          cpfVerificado: true,
          setorCodigo: 'PRO',
          turnoCodigo: 'PRO-M',
          desligamentoDataDesconhecida: false,
        },
        {
          codigo: 'VP-9001',
          nome: 'Duplicada',
          situacao: 'ativo',
          cpf: null,
          cpfVerificado: false,
          setorCodigo: 'PRO',
          turnoCodigo: 'PRO-M',
          desligamentoDataDesconhecida: false,
        },
        {
          codigo: 'VP-9002',
          nome: 'Sem setor',
          situacao: 'ativo',
          cpf: '11111111111',
          cpfVerificado: false,
          setorCodigo: 'NAO',
          turnoCodigo: null,
          desligamentoDataDesconhecida: false,
        },
      ],
      codigosJaGravados: ['VP-9002'],
    });
    expect(result.inserir).toEqual(['PRO', 'PRO-M', 'VP-9001']);
    expect(result.atualizar).toEqual([]);
    expect(result.erros).toEqual([
      { codigo: 'VP-9001', motivo: 'código repetido na carga' },
      { codigo: 'VP-9002', motivo: 'setor desconhecido' },
    ]);
  });
});
