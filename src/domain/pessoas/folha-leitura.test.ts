import { describe, expect, it } from 'vitest';
import { FolhaLeitura } from './folha-leitura';

describe('FolhaLeitura', () => {
  const leitura = new FolhaLeitura();

  it('lê colaborador, vigência, setor e vaga', () => {
    expect(
      leitura.colaboradores([
        { id: 'a', nome: 'Ana', situacao: 'ativo', regime: 'pj', pessoas_setores: { nome: 'Produção' } },
      ]),
    ).toEqual([{ id: 'a', nome: 'Ana', situacao: 'ativo', regime: 'pj', setorNome: 'Produção', nascimento: null }]);
    expect(
      leitura.vigencias([
        {
          colaborador_id: 'a',
          inicio: '2026-03-01',
          salario_centavos: 100,
          vale_transporte_centavos: 0,
          vale_alimentacao_centavos: 0,
          plano_saude: false,
        },
      ])[0],
    ).toMatchObject({ colaboradorId: 'a', inicio: '2026-03-01', planoSaude: false });
    expect(leitura.setores([{ nome: 'Produção', ordem: 1 }])).toEqual([{ nome: 'Produção', ordem: 1 }]);
    expect(leitura.posicoes([{ pessoas_setores: [{ nome: 'Produção' }] }, { pessoas_setores: null }])).toEqual([
      'Produção',
    ]);
  });

  it('recusa plano de saúde que não é sim ou não', () => {
    expect(() =>
      leitura.vigencias([
        {
          colaborador_id: 'a',
          inicio: '2026-03-01',
          salario_centavos: 1,
          vale_transporte_centavos: 0,
          vale_alimentacao_centavos: 0,
          plano_saude: 'sim',
        },
      ]),
    ).toThrow('plano de saúde');
  });
});
