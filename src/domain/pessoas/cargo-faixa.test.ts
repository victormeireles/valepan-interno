import { describe, expect, it } from 'vitest';
import { CargoFaixaLeitura, CargoFaixaNormalizador, CargoFaixaRotulo } from './cargo-faixa';

describe('CargoFaixaNormalizador', () => {
  const normalizador = new CargoFaixaNormalizador();

  it('guarda a faixa em centavos', () => {
    expect(normalizador.normalizar({ nome: 'auxiliar de producao i', de: '1.800,00', ate: '2.200,50' })).toEqual({
      nome: 'Auxiliar de Producao I',
      deCentavos: 180_000,
      ateCentavos: 220_050,
    });
  });

  it('aceita faixa com o mesmo valor nas duas pontas', () => {
    expect(normalizador.normalizar({ nome: 'Aprendiz', de: '0', ate: '0' }).ateCentavos).toBe(0);
  });

  it('recusa faixa invertida e valor ausente', () => {
    expect(() => normalizador.normalizar({ nome: 'Auxiliar', de: '2.000,00', ate: '1.000,00' })).toThrow(
      'O valor final precisa ser maior ou igual ao inicial.',
    );
    expect(() => normalizador.normalizar({ nome: 'Auxiliar', de: '', ate: '1' })).toThrow(
      'Informe o valor inicial da faixa.',
    );
    expect(() => normalizador.normalizar({ nome: 'Auxiliar', de: '1', ate: '' })).toThrow(
      'Informe o valor final da faixa.',
    );
  });
});

describe('CargoFaixaLeitura', () => {
  it('lê a linha do cargo', () => {
    const cargo = new CargoFaixaLeitura().parse({
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Auxiliar',
      de_centavos: 100,
      ate_centavos: 200,
      ativo: false,
    });
    expect(cargo).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Auxiliar',
      deCentavos: 100,
      ateCentavos: 200,
      ativo: false,
    });
  });

  it('recusa linha incompleta', () => {
    expect(() => new CargoFaixaLeitura().parse({ nome: 'Auxiliar' })).toThrow('Cargo inválido.');
  });
});

describe('CargoFaixaRotulo', () => {
  it('mostra de e até em reais', () => {
    expect(new CargoFaixaRotulo().exibir(180_000, 220_050)).toBe('De R$ 1.800,00 até R$ 2.200,50');
  });
});
