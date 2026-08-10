import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import { UsuarioAuthzLoader } from './usuario-authz-loader';

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

class ChainableQuery {
  private filters: Array<{ op: string; column: string; value: unknown }> = [];

  constructor(
    private readonly table: string,
    private readonly resolve: (
      table: string,
      filters: Array<{ op: string; column: string; value: unknown }>,
    ) => QueryResult,
  ) {}

  select(_columns: string): this {
    void _columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  order(_column: string, _options?: { ascending?: boolean }): this {
    void _column;
    void _options;
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.resolve(this.table, this.filters));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.resolve(this.table, this.filters)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class FakeSupabase {
  constructor(
    private readonly handlers: {
      usuarios?: QueryResult;
      usuario_papeis?: QueryResult;
      usuario_perfis?: QueryResult;
    },
  ) {}

  from(table: string): ChainableQuery {
    return new ChainableQuery(table, (requested) => {
      if (requested === 'usuarios') {
        return this.handlers.usuarios ?? { data: null, error: null };
      }
      if (requested === 'usuario_papeis') {
        return this.handlers.usuario_papeis ?? { data: [], error: null };
      }
      if (requested === 'usuario_perfis') {
        return this.handlers.usuario_perfis ?? { data: [], error: null };
      }
      throw new Error(`Tabela inesperada: ${requested}`);
    });
  }
}

function asClient(fake: FakeSupabase): SupabaseClient<DatabaseComAuthz> {
  return fake as unknown as SupabaseClient<DatabaseComAuthz>;
}

describe('UsuarioAuthzLoader', () => {
  it('retorna null quando usuário está inativo', async () => {
    const supabase = asClient(
      new FakeSupabase({
        usuarios: {
          data: {
            ativo: false,
            is_system_owner: false,
            nome: 'Inativo',
            email: 'inativo@valepan.com',
          },
          error: null,
        },
      }),
    );

    const snap = await new UsuarioAuthzLoader(supabase).load('user-inativo');

    expect(snap).toBeNull();
  });

  it('retorna null quando usuário não existe', async () => {
    const supabase = asClient(
      new FakeSupabase({
        usuarios: { data: null, error: null },
      }),
    );

    const snap = await new UsuarioAuthzLoader(supabase).load('missing');

    expect(snap).toBeNull();
  });

  it('agrega módulos interno_* de perfis ativos (tablet fermentação)', async () => {
    const supabase = asClient(
      new FakeSupabase({
        usuarios: {
          data: {
            ativo: true,
            is_system_owner: false,
            nome: 'Tablet Fermentação',
            email: 'tablet@valepan.com',
          },
          error: null,
        },
        usuario_papeis: {
          data: [{ papel: 'interno' }],
          error: null,
        },
        usuario_perfis: {
          data: [
            {
              perfil_id: 'tablet-fermentacao',
              perfil: {
                id: 'tablet-fermentacao',
                nome: 'Tablet Fermentação',
                ativo: true,
                perfil_modulos: [
                  { modulo: 'interno_fermentacao', nivel: 'editar' },
                  { modulo: 'interno_painel', nivel: 'ler' },
                  { modulo: 'pedidos', nivel: 'administrar' },
                ],
              },
            },
            {
              perfil_id: 'inactive-perfil',
              perfil: {
                id: 'inactive-perfil',
                nome: 'Inativo',
                ativo: false,
                perfil_modulos: [
                  { modulo: 'interno_config', nivel: 'administrar' },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );

    const snap = await new UsuarioAuthzLoader(supabase).load('user-tablet');

    expect(snap).toEqual({
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_fermentacao: 'editar',
        interno_painel: 'ler',
      },
    });
  });

  it('ignora perfis órfãos sem identidade interno (não-owner)', async () => {
    const supabase = asClient(
      new FakeSupabase({
        usuarios: {
          data: {
            ativo: true,
            is_system_owner: false,
            nome: 'Cliente',
            email: 'cliente@valepan.com',
          },
          error: null,
        },
        usuario_papeis: {
          data: [{ papel: 'cliente' }],
          error: null,
        },
        usuario_perfis: {
          data: [
            {
              perfil_id: 'admin-perfil',
              perfil: {
                id: 'admin-perfil',
                nome: 'Administrador',
                ativo: true,
                perfil_modulos: [
                  { modulo: 'interno_config', nivel: 'administrar' },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );

    const snap = await new UsuarioAuthzLoader(supabase).load('cliente-1');

    expect(snap).toEqual({
      isSystemOwner: false,
      identidades: ['cliente'],
      modulosEfetivos: {},
    });
  });

  it('owner sem identidade interno ainda resolve perfis ativos', async () => {
    const supabase = asClient(
      new FakeSupabase({
        usuarios: {
          data: {
            ativo: true,
            is_system_owner: true,
            nome: 'Owner',
            email: 'owner@valepan.com',
          },
          error: null,
        },
        usuario_papeis: {
          data: [{ papel: 'cliente' }],
          error: null,
        },
        usuario_perfis: {
          data: [
            {
              perfil_id: 'ops',
              perfil: {
                id: 'ops',
                nome: 'Ops',
                ativo: true,
                perfil_modulos: [
                  { modulo: 'interno_ordens', nivel: 'ler' },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );

    const snap = await new UsuarioAuthzLoader(supabase).load('owner-1');

    expect(snap).toEqual({
      isSystemOwner: true,
      identidades: ['cliente'],
      modulosEfetivos: {
        interno_ordens: 'ler',
      },
    });
  });
});
