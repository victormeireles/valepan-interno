import { describe, expect, it } from 'vitest';
import {
  EtapaTurnoUltimoStore,
  turnoUltimoStorageKey,
} from './etapa-turno-ultimo-store';

describe('EtapaTurnoUltimoStore', () => {
  it('lê e grava o número por etapa', () => {
    const memory = new Map<string, string>();
    const store = new EtapaTurnoUltimoStore({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => {
        memory.set(k, v);
      },
    });
    expect(store.read('fermentacao')).toBeNull();
    store.write('fermentacao', 2);
    expect(store.read('fermentacao')).toBe(2);
    expect(store.read('forno')).toBeNull();
  });

  it('chave segue o prefixo da spec', () => {
    expect(turnoUltimoStorageKey('embalagem')).toBe(
      'valepan.producao.turno.ultimo.embalagem',
    );
  });
});
