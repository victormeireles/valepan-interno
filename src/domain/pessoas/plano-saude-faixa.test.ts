import { describe, expect, it } from 'vitest';
import {
  IdadeCivil,
  PlanoSaudeFaixaConflito,
  PlanoSaudeFaixaConsulta,
  PlanoSaudeFaixaNormalizador,
  PlanoSaudeNaFolha,
  type PlanoSaudeFaixa,
} from './plano-saude-faixa';

const FAIXAS: PlanoSaudeFaixa[] = [
  { id: 'a', idadeMin: 0, idadeMax: 18, valorCentavos: 21675, ordem: 1 },
  { id: 'b', idadeMin: 19, idadeMax: 23, valorCentavos: 27094, ordem: 2 },
  { id: 'c', idadeMin: 59, idadeMax: null, valorCentavos: 130048, ordem: 10 },
];

describe('IdadeCivil', () => {
  const idade = new IdadeCivil();

  it('completa anos na data de referência', () => {
    expect(idade.anos('2008-11-05', '2026-11-05')).toBe(18);
    expect(idade.anos('2008-11-06', '2026-11-05')).toBe(17);
    expect(idade.anos('1960-01-01', '2026-11-05')).toBe(66);
  });

  it('sem data ou data futura não tem idade', () => {
    expect(idade.anos(null, '2026-11-05')).toBeNull();
    expect(idade.anos('2027-01-01', '2026-11-05')).toBeNull();
  });
});

describe('PlanoSaudeFaixaConsulta', () => {
  const consulta = new PlanoSaudeFaixaConsulta();

  it('escolhe a faixa da idade, inclusive o limite e 59 ou mais', () => {
    expect(consulta.valor(FAIXAS, 0)).toBe(21675);
    expect(consulta.valor(FAIXAS, 18)).toBe(21675);
    expect(consulta.valor(FAIXAS, 19)).toBe(27094);
    expect(consulta.valor(FAIXAS, 59)).toBe(130048);
    expect(consulta.valor(FAIXAS, 80)).toBe(130048);
    expect(consulta.valor(FAIXAS, 30)).toBeNull();
  });
});

describe('PlanoSaudeNaFolha', () => {
  const plano = new PlanoSaudeNaFolha();

  it('só cobra quem está marcado e cabe numa faixa', () => {
    expect(plano.resolver(false, '1990-01-01', FAIXAS, '2026-11-05').centavos).toBe(0);
    expect(plano.resolver(true, '2005-01-01', FAIXAS, '2026-11-05')).toMatchObject({
      centavos: 27094,
      semFaixa: false,
    });
  });

  it('marca a lacuna quando falta nascimento ou faixa', () => {
    expect(plano.resolver(true, null, FAIXAS, '2026-11-05').motivo).toBe('sem_nascimento');
    expect(plano.resolver(true, '1996-01-01', FAIXAS, '2026-11-05').motivo).toBe('sem_faixa');
  });
});

describe('PlanoSaudeFaixaNormalizador', () => {
  const normalizador = new PlanoSaudeFaixaNormalizador();

  it('aceita idade final vazia como ou mais e valor em reais', () => {
    expect(normalizador.normalizar({ idadeMin: '59', idadeMax: '', valor: '1.300,48' })).toEqual({
      idadeMin: 59,
      idadeMax: null,
      valorCentavos: 130048,
    });
  });

  it('recusa idade final antes da inicial', () => {
    expect(() => normalizador.normalizar({ idadeMin: '30', idadeMax: '18', valor: '10,00' })).toThrow(
      'A idade final fica antes da inicial.',
    );
  });
});

describe('PlanoSaudeFaixaConflito', () => {
  const conflito = new PlanoSaudeFaixaConflito();

  it('vê cruzamento e ignora a própria faixa na edição', () => {
    expect(conflito.cruza(FAIXAS, { idadeMin: 18, idadeMax: 20, valorCentavos: 1 })).toBe(true);
    expect(conflito.cruza(FAIXAS, { idadeMin: 0, idadeMax: 18, valorCentavos: 1 }, 'a')).toBe(false);
  });
});
