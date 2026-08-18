import { describe, expect, it } from 'vitest';
import { EstimativaProdutividadeResolver } from './estimativa-producao-produtividade';
import type { EstimativaProdutividadeMensal } from './estimativa-producao-types';

const july: EstimativaProdutividadeMensal = {
  anoMes: '2026-07',
  taxaAssadeirasHoraProducao: 180,
  taxaAssadeirasHoraForno: 180,
  taxaCaixasHoraEmbalagem: 90,
};

const august: EstimativaProdutividadeMensal = {
  anoMes: '2026-08',
  taxaAssadeirasHoraProducao: 200,
  taxaAssadeirasHoraForno: 200,
  taxaCaixasHoraEmbalagem: 100,
};

const invalid: EstimativaProdutividadeMensal = {
  anoMes: '2026-08',
  taxaAssadeirasHoraProducao: 0,
  taxaAssadeirasHoraForno: 200,
  taxaCaixasHoraEmbalagem: 100,
};

const resolver = new EstimativaProdutividadeResolver();

describe('EstimativaProdutividadeResolver', () => {
  it('usa o mês exato quando as taxas são válidas', () => {
    expect(resolver.resolve('2026-08', [july, august])).toEqual(august);
  });

  it('cai no mês anterior válido quando o mês atual não tem taxa', () => {
    expect(resolver.resolve('2026-08', [july, invalid])).toEqual(july);
  });

  it('retorna nulo quando não há mês válido até a data', () => {
    expect(resolver.resolve('2026-06', [july, august])).toBeNull();
  });
});
