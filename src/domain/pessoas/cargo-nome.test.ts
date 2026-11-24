import { describe, expect, it } from 'vitest';
import { CargoNome, CargoNomeUnico } from './cargo-nome';

describe('CargoNome', () => {
  const nomes = new CargoNome();

  it('capitaliza o nome e preserva o algarismo romano', () => {
    expect(nomes.formatar('  auxiliar   de producao ii ')).toBe('Auxiliar de Producao II');
    expect(nomes.formatar('auxiliar de produção I')).toBe('Auxiliar de Produção I');
  });

  it('recusa nome curto e nome longo', () => {
    expect(() => nomes.exigir('A')).toThrow('Informe o nome do cargo.');
    expect(() => nomes.exigir('')).toThrow('Informe o nome do cargo.');
    expect(() => nomes.exigir('a'.repeat(81))).toThrow('Nome longo demais.');
    expect(nomes.exigir('Auxiliar')).toBe('Auxiliar');
  });
});

describe('CargoNomeUnico', () => {
  const unico = new CargoNomeUnico();

  it('enxerga o mesmo nome sem distinguir maiúsculas, fora o próprio cargo', () => {
    const lista = [{ id: 'a', nome: 'Auxiliar de Produção I' }];
    expect(unico.repetido(lista, 'auxiliar de produção i')).toBe(true);
    expect(unico.repetido(lista, 'auxiliar de produção i', 'a')).toBe(false);
    expect(unico.repetido(lista, 'Auxiliar de Produção II')).toBe(false);
  });
});
