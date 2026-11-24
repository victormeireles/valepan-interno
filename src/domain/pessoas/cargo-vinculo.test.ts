import { describe, expect, it } from 'vitest';
import { CargoExclusao, CargoVinculo } from './cargo-vinculo';

const ID = '11111111-1111-4111-8111-111111111111';

describe('CargoVinculo', () => {
  const vinculo = new CargoVinculo();

  it('aceita vazio, cargo ativo e o cargo atual mesmo inativo', () => {
    expect(() => vinculo.aceitar({ ativo: null, cargoAtualId: null, escolhido: null })).not.toThrow();
    expect(() => vinculo.aceitar({ ativo: true, cargoAtualId: null, escolhido: ID })).not.toThrow();
    expect(() => vinculo.aceitar({ ativo: false, cargoAtualId: ID, escolhido: ID })).not.toThrow();
  });

  it('recusa cargo inexistente e cargo inativo que a pessoa ainda não tem', () => {
    expect(() => vinculo.aceitar({ ativo: null, cargoAtualId: null, escolhido: ID })).toThrow('Cargo inválido.');
    expect(() => vinculo.aceitar({ ativo: false, cargoAtualId: null, escolhido: ID })).toThrow(
      'Este cargo não está disponível.',
    );
  });
});

describe('CargoExclusao', () => {
  it('só deixa apagar cargo sem uso', () => {
    const exclusao = new CargoExclusao();
    expect(exclusao.mensagemSeUsado(0)).toBeNull();
    expect(exclusao.mensagemSeUsado(2)).toBe(
      'Este cargo está em uso. Desative para tirá-lo das novas escolhas.',
    );
  });
});
