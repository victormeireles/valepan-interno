import { describe, expect, it } from 'vitest';
import {
  custoUnitarioFromForm,
  estadoInicialFromCusto,
  resolveInsumoCustoEstado,
} from './insumo-custo-estado';

describe('resolveInsumoCustoEstado', () => {
  it('null ou undefined → pendente', () => {
    expect(resolveInsumoCustoEstado(null)).toBe('pendente');
    expect(resolveInsumoCustoEstado(undefined)).toBe('pendente');
  });

  it('0 → sem_custo', () => {
    expect(resolveInsumoCustoEstado(0)).toBe('sem_custo');
  });

  it('> 0 → com_custo', () => {
    expect(resolveInsumoCustoEstado(3.5)).toBe('com_custo');
  });
});

describe('custoUnitarioFromForm', () => {
  it('pendente → null', () => {
    expect(custoUnitarioFromForm('pendente', 99)).toBeNull();
  });

  it('sem_custo → 0', () => {
    expect(custoUnitarioFromForm('sem_custo', null)).toBe(0);
  });

  it('com_custo → valor digitado', () => {
    expect(custoUnitarioFromForm('com_custo', 12.5)).toBe(12.5);
  });

  it('com_custo sem valor → null', () => {
    expect(custoUnitarioFromForm('com_custo', null)).toBeNull();
    expect(custoUnitarioFromForm('com_custo', 0)).toBeNull();
  });
});

describe('estadoInicialFromCusto', () => {
  it('espelha resolveInsumoCustoEstado', () => {
    expect(estadoInicialFromCusto(null)).toBe('pendente');
    expect(estadoInicialFromCusto(0)).toBe('sem_custo');
    expect(estadoInicialFromCusto(10)).toBe('com_custo');
  });
});
