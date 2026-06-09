import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROUTES = [
  'src/app/api/submit/forno-pedido/route.ts',
  'src/app/api/submit/embalagem-pedido/route.ts',
  'src/app/api/produtos/[nomeProduto]/assadeiras/route.ts',
];

describe('rotas de fator de assadeira', () => {
  for (const route of ROUTES) {
    it(`${route} usa unidades_por_assadeira como fallback da assadeira`, () => {
      const content = readFileSync(join(process.cwd(), route), 'utf8');
      expect(content).toMatch(
        /assadeiras\?\.unidades_por_assadeira|assadeiras\(unidades_por_assadeira/,
      );
      expect(content).not.toContain('quantidade_latas');
    });
  }
});
