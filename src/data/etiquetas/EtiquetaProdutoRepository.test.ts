import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/types/database';
import { EtiquetaProdutoRepository } from './EtiquetaProdutoRepository';

class RepositoryFixture {
  readonly request = vi.fn<typeof fetch>();
  readonly client = createClient<Database>('https://example.supabase.co', 'test-key', {
    global: { fetch: this.request }, auth: { persistSession: false },
  });
  readonly repository = new EtiquetaProdutoRepository({ createServiceRoleClient: () => this.client });

  respond(rows: unknown[], status = 200) {
    this.request.mockResolvedValue(new Response(JSON.stringify(rows), {
      status, headers: { 'Content-Type': 'application/json' },
    }));
  }

  get params() { return new URL(String(this.request.mock.calls[0][0])).searchParams; }
}

describe('EtiquetaProdutoRepository', () => {
  it('prioriza ID e carrega os nomes pelas relações do produto ativo', async () => {
    const fixture = new RepositoryFixture();
    fixture.respond([{
      id: 'produto-id', nome: 'Produto', nome_etiqueta: 'Nome antigo', categoria_id: 'cat',
      unit_weight: 65, dias_validade_ambiente: 21, unit_barcode: '123',
      box_units: 48, package_units: 6,
      categorias: { nome: 'Hambúrguer' }, produto_familias: { nome_exibicao: 'Brioche' },
    }]);
    const produto = await fixture.repository.findProduto({ produtoId: 'produto-id', produto: 'Outro nome' });
    expect(fixture.params.get('id')).toBe('eq.produto-id');
    expect(fixture.params.has('nome')).toBe(false);
    expect(fixture.params.get('ativo')).toBe('eq.true');
    expect(fixture.params.get('select')).toContain('produto_familias(nome_exibicao)');
    expect(produto).toMatchObject({ familiaNome: 'Brioche', categoriaNome: 'Hambúrguer', unidadesPorCaixa: 48 });
  });

  it('mantém busca por nome sem interpretar curingas como outros produtos', async () => {
    const fixture = new RepositoryFixture();
    fixture.respond([]);
    expect(await fixture.repository.findProduto({ produto: 'Pão 100%_especial' })).toBeNull();
    expect(fixture.params.get('nome')).toBe('ilike.Pão 100\\%\\_especial');
  });

  it('carrega somente pesos de produtos ativos da categoria selecionada', async () => {
    const fixture = new RepositoryFixture();
    fixture.respond([{ nome: 'Pão', unit_weight: 70 }]);
    expect(await fixture.repository.listPesosCategoria('hot-dog')).toEqual([{ nome: 'Pão', unit_weight: 70 }]);
    expect(fixture.params.get('categoria_id')).toBe('eq.hot-dog');
    expect(fixture.params.get('ativo')).toBe('eq.true');
    expect(fixture.params.get('select')).toBe('nome,unit_weight');
  });

  it('propaga falhas de consulta sem gerar uma régua incompleta', async () => {
    const fixture = new RepositoryFixture();
    fixture.respond([], 400);
    await expect(fixture.repository.listPesosCategoria('categoria')).rejects.toThrow('Erro ao buscar gramaturas');
  });
});
