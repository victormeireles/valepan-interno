import { describe, it, expect } from 'vitest';
import {
  resolveAssadeiraIdForTipoLata,
  type AssadeiraCandidato,
  type ProdutoUnidadesLataMeta,
} from './ordem-producao-assadeira';

const meta: ProdutoUnidadesLataMeta = {
  unidades_assadeira: 10,
  unidades_lata_antiga: 12,
  unidades_lata_nova: 14,
};

const candidatos: AssadeiraCandidato[] = [
  { assadeira_id: 'a-ant', unidades_por_assadeira: 12 },
  { assadeira_id: 'a-nov', unidades_por_assadeira: 14 },
  { assadeira_id: 'a-out', unidades_por_assadeira: 20 },
];

describe('resolveAssadeiraIdForTipoLata', () => {
  it('antiga: escolhe assadeira com unidades da lata antiga', () => {
    expect(resolveAssadeiraIdForTipoLata('antiga', meta, candidatos)).toBe('a-ant');
  });
  it('nova: escolhe assadeira com unidades da lata nova', () => {
    expect(resolveAssadeiraIdForTipoLata('nova', meta, candidatos)).toBe('a-nov');
  });
  it('outra: escolhe candidato que não é só antiga nem só nova', () => {
    expect(resolveAssadeiraIdForTipoLata('outra', meta, candidatos)).toBe('a-out');
  });
  it('fallback: uma única candidata', () => {
    const one = [{ assadeira_id: 'only', unidades_por_assadeira: 99 }];
    expect(resolveAssadeiraIdForTipoLata('antiga', meta, one)).toBe('only');
  });
});
