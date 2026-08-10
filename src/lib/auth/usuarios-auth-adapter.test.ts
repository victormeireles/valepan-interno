import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import { createUsuariosAuthAdapter } from './usuarios-auth-adapter';

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

class ChainableQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private insertPayload: unknown = null;
  private updatePayload: unknown = null;
  private deleteRequested = false;

  constructor(
    private readonly table: string,
    private readonly resolve: (args: {
      table: string;
      filters: Array<{ column: string; value: unknown }>;
      insertPayload: unknown;
      updatePayload: unknown;
      deleteRequested: boolean;
    }) => QueryResult,
  ) {}

  select(_columns?: string): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  insert(payload: unknown): this {
    this.insertPayload = payload;
    return this;
  }

  update(payload: unknown): this {
    this.updatePayload = payload;
    return this;
  }

  delete(): this {
    this.deleteRequested = true;
    return this;
  }

  single(): Promise<QueryResult> {
    return Promise.resolve(this.run());
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.run());
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult {
    return this.resolve({
      table: this.table,
      filters: this.filters,
      insertPayload: this.insertPayload,
      updatePayload: this.updatePayload,
      deleteRequested: this.deleteRequested,
    });
  }
}

class FakeSupabase {
  constructor(
    private readonly handlers: {
      usuarios?: (args: {
        filters: Array<{ column: string; value: unknown }>;
        insertPayload: unknown;
        updatePayload: unknown;
      }) => QueryResult;
      verification_tokens?: (args: {
        filters: Array<{ column: string; value: unknown }>;
        insertPayload: unknown;
        deleteRequested: boolean;
      }) => QueryResult;
    },
  ) {}

  from(table: string): ChainableQuery {
    return new ChainableQuery(table, (args) => {
      if (args.table === 'usuarios') {
        return (
          this.handlers.usuarios?.({
            filters: args.filters,
            insertPayload: args.insertPayload,
            updatePayload: args.updatePayload,
          }) ?? { data: null, error: null }
        );
      }
      if (args.table === 'verification_tokens') {
        return (
          this.handlers.verification_tokens?.({
            filters: args.filters,
            insertPayload: args.insertPayload,
            deleteRequested: args.deleteRequested,
          }) ?? { data: null, error: null }
        );
      }
      throw new Error(`Tabela inesperada: ${args.table}`);
    });
  }
}

function asClient(fake: FakeSupabase): SupabaseClient<DatabaseComAuthz> {
  return fake as unknown as SupabaseClient<DatabaseComAuthz>;
}

describe('createUsuariosAuthAdapter', () => {
  it('createUser lança erro — usuários só são criados no Pedidos', async () => {
    const adapter = createUsuariosAuthAdapter({
      createClient: () => asClient(new FakeSupabase({})),
    });

    await expect(
      adapter.createUser!({
        id: 'ignored',
        email: 'novo@valepan.com',
        emailVerified: null,
      }),
    ).rejects.toThrow('Usuários são criados apenas no Pedidos');
  });

  it('getUserByEmail mapeia usuarios.nome para name', async () => {
    const adapter = createUsuariosAuthAdapter({
      createClient: () =>
        asClient(
          new FakeSupabase({
            usuarios: () => ({
              data: {
                id: 'user-1',
                email: 'ops@valepan.com',
                nome: 'Operador',
                ativo: true,
              },
              error: null,
            }),
          }),
        ),
    });

    const user = await adapter.getUserByEmail!('ops@valepan.com');

    expect(user).toEqual({
      id: 'user-1',
      email: 'ops@valepan.com',
      name: 'Operador',
      emailVerified: null,
      image: undefined,
    });
  });

  it('getUserByEmail retorna null quando não encontra', async () => {
    const adapter = createUsuariosAuthAdapter({
      createClient: () =>
        asClient(
          new FakeSupabase({
            usuarios: () => ({ data: null, error: null }),
          }),
        ),
    });

    await expect(adapter.getUserByEmail!('x@valepan.com')).resolves.toBeNull();
  });

  it('createVerificationToken persiste token.expires do Auth.js', async () => {
    const authExpires = new Date('2026-08-10T18:00:00.000Z');
    let insertedExpires: string | undefined;

    const adapter = createUsuariosAuthAdapter({
      createClient: () =>
        asClient(
          new FakeSupabase({
            verification_tokens: ({ insertPayload }) => {
              insertedExpires = (insertPayload as { expires: string }).expires;
              return {
                data: insertPayload,
                error: null,
              };
            },
          }),
        ),
    });

    const created = await adapter.createVerificationToken!({
      identifier: 'ops@valepan.com',
      token: 'tok-1',
      expires: authExpires,
    });

    expect(insertedExpires).toBe(authExpires.toISOString());
    expect(created).toEqual({
      identifier: 'ops@valepan.com',
      token: 'tok-1',
      expires: authExpires,
    });
  });

  it('useVerificationToken remove token válido e retorna dados', async () => {
    const deleteSpy = vi.fn();
    const expires = new Date(Date.now() + 60_000).toISOString();

    const adapter = createUsuariosAuthAdapter({
      createClient: () =>
        asClient(
          new FakeSupabase({
            verification_tokens: ({ deleteRequested, filters }) => {
              if (deleteRequested) {
                deleteSpy(filters);
                return { data: null, error: null };
              }
              return {
                data: {
                  identifier: 'ops@valepan.com',
                  token: 'tok-1',
                  expires,
                },
                error: null,
              };
            },
          }),
        ),
    });

    const used = await adapter.useVerificationToken!({
      identifier: 'ops@valepan.com',
      token: 'tok-1',
    });

    expect(used).toEqual({
      identifier: 'ops@valepan.com',
      token: 'tok-1',
      expires: new Date(expires),
    });
    expect(deleteSpy).toHaveBeenCalled();
  });
});
