import { describe, expect, it } from 'vitest';
import { CargoOpcaoLeitura, CargoOpcoesLista } from './cargo-opcao';

const ID = '11111111-1111-4111-8111-111111111111';
const OUTRO = '22222222-2222-4222-8222-222222222222';

describe('CargoOpcaoLeitura', () => {
  it('devolve só id e nome', () => {
    const opcao = new CargoOpcaoLeitura().parse({
      id: ID,
      nome: 'Auxiliar',
      de_centavos: 180_000,
      ate_centavos: 220_000,
    });
    expect(opcao).toEqual({ id: ID, nome: 'Auxiliar' });
    expect(opcao).not.toHaveProperty('de_centavos');
    expect(opcao).not.toHaveProperty('ate_centavos');
  });
});

describe('CargoOpcoesLista', () => {
  const lista = new CargoOpcoesLista();

  it('mantém o cargo atual quando ele não está entre os ativos', () => {
    const opcoes = lista.montar([{ id: OUTRO, nome: 'Outro' }], { cargoId: ID, cargoNome: 'Antigo' });
    expect(opcoes).toEqual([
      { id: OUTRO, nome: 'Outro' },
      { id: ID, nome: 'Antigo' },
    ]);
  });

  it('não duplica o cargo atual', () => {
    const opcoes = [{ id: ID, nome: 'Auxiliar' }];
    expect(lista.montar(opcoes, { cargoId: ID, cargoNome: 'Auxiliar' })).toEqual(opcoes);
    expect(lista.montar(opcoes, { cargoId: null, cargoNome: null })).toEqual(opcoes);
  });
});
