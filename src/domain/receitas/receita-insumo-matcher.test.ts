import { describe, expect, it } from 'vitest';
import { matchLinhasComCatalogo } from './receita-insumo-matcher';
import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

const catalogo: InsumoCatalogoItem[] = [
  {
    id: '1',
    nome: 'Farinha de trigo especial',
    unidadeCodigo: 'KG',
    unidadeNome: 'Quilograma',
    custoUnitario: 5,
  },
  {
    id: '2',
    nome: 'Açúcar cristal',
    unidadeCodigo: 'KG',
    unidadeNome: 'Quilograma',
    custoUnitario: 3,
  },
];

describe('matchLinhasComCatalogo', () => {
  it('match exato ignora acento', () => {
    const [row] = matchLinhasComCatalogo(
      [{ nomeColado: 'Acucar cristal', quantidade: 1 }],
      catalogo,
      new Set(),
    );
    expect(row.status).toBe('matched');
    expect(row.insumoId).toBe('2');
    expect(row.score).toBe(1);
  });

  it('marca review entre 50% e 84%', () => {
    const [row] = matchLinhasComCatalogo(
      [{ nomeColado: 'Farinha trigo', quantidade: 0.3 }],
      catalogo,
      new Set(),
    );
    expect(['matched', 'review']).toContain(row.status);
  });

  it('pula duplicata já usada', () => {
    const [row] = matchLinhasComCatalogo(
      [{ nomeColado: 'Açúcar cristal', quantidade: 1 }],
      catalogo,
      new Set(['2']),
    );
    expect(row.skippedDuplicate).toBe(true);
    expect(row.insumoId).toBeNull();
  });
});
