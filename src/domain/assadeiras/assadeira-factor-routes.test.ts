import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROUTE_PATTERNS: Record<string, RegExp> = {
  'src/app/api/submit/forno-pedido/route.ts':
    /assadeiras\?\.unidades_por_assadeira|assadeiras\(unidades_por_assadeira|assadeiraResolver|resolveUnidadesPorAssadeiraEfetiva/,
  'src/app/api/submit/embalagem-pedido/route.ts':
    /ordemProducaoMetaService|assadeiraResolver|resolveUnidadesPorAssadeiraEfetiva/,
  'src/app/api/produtos/[nomeProduto]/assadeiras/route.ts':
    /assadeiraResolver|resolveUnidadesPorAssadeiraEfetiva/,
};

describe('rotas de fator de assadeira', () => {
  for (const [route, pattern] of Object.entries(ROUTE_PATTERNS)) {
    it(`${route} resolve fator via assadeira/regra, não estoque`, () => {
      const content = readFileSync(join(process.cwd(), route), 'utf8');
      expect(content).toMatch(pattern);
      expect(content).not.toContain('quantidade_latas');
    });
  }
});
