import { describe, expect, it } from 'vitest';
import {
  formatarFeedbackQuantidadeBrilho,
  formatarFeedbackQuantidadeConfeito,
  formatarFeedbackQuantidadeMassa,
} from './receita-quantidade-feedback';

describe('formatarFeedbackQuantidadeMassa', () => {
  const ingredientes = [{ quantidade: 1.5, unidade: 'kg' }];

  it('mostra peso total e gramas por unidade quando a qtd difere da sugestão', () => {
    expect(formatarFeedbackQuantidadeMassa(ingredientes, 30, 28)).toBe(
      'Massa total: 1.500 g ÷ 30 = 50 g de massa crua por unidade',
    );
  });

  it('mostra só o peso total quando a qtd está em branco', () => {
    expect(formatarFeedbackQuantidadeMassa(ingredientes, undefined, 28)).toBe(
      'Massa total: 1.500 g',
    );
  });

  it('não mostra feedback quando a qtd coincide com a sugestão', () => {
    expect(formatarFeedbackQuantidadeMassa(ingredientes, 28, 28)).toBeNull();
  });
});

describe('formatarFeedbackQuantidadeConfeito', () => {
  const ingredientes = [{ quantidade: 2, unidade: 'kg' }];

  it('mostra peso total e gramas de confeito por unidade', () => {
    expect(formatarFeedbackQuantidadeConfeito(ingredientes, 400, 6000)).toBe(
      'Peso total: 2 kg ÷ 400 = 5 g de confeito por unidade',
    );
  });

  it('mostra só o peso total quando a qtd está em branco', () => {
    expect(formatarFeedbackQuantidadeConfeito(ingredientes, undefined, 6000)).toBe(
      'Peso total: 2 kg',
    );
  });
});

describe('formatarFeedbackQuantidadeBrilho', () => {
  const ingredientes = [
    { quantidade: 2, unidade: 'L' },
    { quantidade: 3, unidade: 'kg' },
  ];

  it('mostra volume total e ml de brilho por unidade', () => {
    expect(formatarFeedbackQuantidadeBrilho(ingredientes, 600, 24440)).toBe(
      'Volume total: 5 L ÷ 600 = 8,3 ml de brilho por unidade',
    );
  });

  it('mostra só o volume total quando a qtd está em branco', () => {
    expect(formatarFeedbackQuantidadeBrilho(ingredientes, undefined, 24440)).toBe(
      'Volume total: 5 L',
    );
  });
});
