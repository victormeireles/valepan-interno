import { describe, expect, it } from 'vitest';
import { EtiquetaRequestParser } from './EtiquetaRequestParser';
import { etiquetaRequestFixture as request } from '@/domain/etiquetas/etiqueta-test-fixtures';

describe('EtiquetaRequestParser', () => {
  const parser = new EtiquetaRequestParser();

  it('aceita ID ou o nome legado e descarta controles de congelamento', () => {
    expect(parser.parse(request).success).toBe(true);
    const parsed = parser.parse({ ...request, produtoId: undefined, produto: 'Pão', congelado: true, diasValidadeCongelado: 120 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).not.toHaveProperty('congelado');
  });

  it.each([
    { produtoId: undefined }, { produtoId: 'id inválido' },
    { dataFabricacao: '2026-02-30' }, { dataFabricacao: '03/09/2026' },
    { lote: 0 }, { diasValidade: -1 }, { nomeEtiqueta: 'a'.repeat(121) },
  ])('rejeita entrada inválida %j', (override) => {
    expect(parser.parse({ ...request, ...override }).success).toBe(false);
  });
});
