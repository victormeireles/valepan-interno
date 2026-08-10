import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginQrRequestManager } from '@/lib/auth/qr/login-qr-request-manager';
import { LoginQrTokenHasher } from '@/lib/auth/qr/login-qr-token-hasher';
import type { Database } from '@/types/database';

type LoginQrRow = Database['public']['Tables']['login_qr_requests']['Row'];

class InMemoryLoginQrTable {
  readonly rows = new Map<string, LoginQrRow>();

  insert(payload: Partial<LoginQrRow>) {
    const row: LoginQrRow = {
      id: payload.id ?? crypto.randomUUID(),
      status: payload.status ?? 'pending',
      usuario_id: payload.usuario_id ?? null,
      exchange_token_hash: payload.exchange_token_hash ?? null,
      expires_at: payload.expires_at ?? new Date().toISOString(),
      approved_at: payload.approved_at ?? null,
      consumed_at: payload.consumed_at ?? null,
      created_at: payload.created_at ?? new Date().toISOString(),
    };
    this.rows.set(row.id, row);
    return this.selectResult(row);
  }

  select() {
    return this;
  }

  update(payload: Partial<LoginQrRow>) {
    this.pendingUpdate = payload;
    return this;
  }

  eq(column: keyof LoginQrRow, value: string) {
    this.filters.push({ column, value, mode: 'eq' });
    return this;
  }

  in(column: keyof LoginQrRow, values: string[]) {
    this.filters.push({ column, values, mode: 'in' });
    return this;
  }

  async single() {
    const rows = this.applyFilters([...this.rows.values()]);
    this.resetQuery();
    if (rows.length !== 1) {
      return { data: null, error: { message: 'single failed' } };
    }
    return { data: rows[0], error: null };
  }

  async maybeSingle() {
    const rows = this.applyFilters([...this.rows.values()]);
    const pending = this.pendingUpdate;
    this.resetQuery();
    if (pending) {
      if (rows.length === 0) {
        return { data: null, error: null };
      }
      const current = rows[0];
      if (!current) {
        return { data: null, error: null };
      }
      const updated: LoginQrRow = {
        ...current,
        ...pending,
        id: current.id,
      };
      this.rows.set(updated.id, updated);
      return { data: updated, error: null };
    }
    return { data: rows[0] ?? null, error: null };
  }

  private pendingUpdate: Partial<LoginQrRow> | null = null;
  private filters: Array<
    | { mode: 'eq'; column: keyof LoginQrRow; value: string }
    | { mode: 'in'; column: keyof LoginQrRow; values: string[] }
  > = [];

  private selectResult(row: LoginQrRow) {
    return {
      select: () => ({
        single: async () => ({ data: row, error: null }),
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    };
  }

  private applyFilters(rows: LoginQrRow[]): LoginQrRow[] {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        if (filter.mode === 'eq') {
          return row[filter.column] === filter.value;
        }
        return filter.values.includes(String(row[filter.column] ?? ''));
      }),
    );
  }

  private resetQuery() {
    this.pendingUpdate = null;
    this.filters = [];
  }
}

function createFakeSupabase(table: InMemoryLoginQrTable) {
  return {
    from: (name: string) => {
      if (name !== 'login_qr_requests') {
        throw new Error(`unexpected table ${name}`);
      }
      return table;
    },
  };
}

describe('LoginQrRequestManager', () => {
  let table: InMemoryLoginQrTable;
  let manager: LoginQrRequestManager;
  const hasher = new LoginQrTokenHasher();

  beforeEach(() => {
    table = new InMemoryLoginQrTable();
    manager = new LoginQrRequestManager(
      createFakeSupabase(table) as never,
      hasher,
    );
  });

  it('create retorna id, expiresAt e approvePath', async () => {
    const created = await manager.create();
    expect(created.id).toBeTruthy();
    expect(created.approvePath).toBe(`/login/qr/aprovar?id=${created.id}`);
    expect(new Date(created.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('approve em pending ok; approve expirado falha', async () => {
    const created = await manager.create();
    const ok = await manager.approve(created.id, 'usuario-1');
    expect(ok).toEqual({ ok: true });

    const expiredId = crypto.randomUUID();
    table.rows.set(expiredId, {
      id: expiredId,
      status: 'pending',
      usuario_id: null,
      exchange_token_hash: null,
      expires_at: new Date(Date.now() - 1_000).toISOString(),
      approved_at: null,
      consumed_at: null,
      created_at: new Date().toISOString(),
    });

    const failed = await manager.approve(expiredId, 'usuario-1');
    expect(failed).toEqual({ ok: false, reason: 'expired' });
  });

  it('pollForTv em approved devolve token uma vez', async () => {
    vi.spyOn(hasher, 'createToken').mockReturnValue('token-unico-de-teste-32chars!!');
    const created = await manager.create();
    await manager.approve(created.id, 'usuario-1');

    const first = await manager.pollForTv(created.id);
    expect(first).toEqual({
      status: 'approved',
      exchangeToken: 'token-unico-de-teste-32chars!!',
    });

    const second = await manager.pollForTv(created.id);
    expect(second).toEqual({ status: 'consumed' });
  });

  it('redeemExchangeToken sucesso zera hash; segunda redeem null', async () => {
    vi.spyOn(hasher, 'createToken').mockReturnValue('token-unico-de-teste-32chars!!');
    const created = await manager.create();
    await manager.approve(created.id, 'usuario-42');
    const polled = await manager.pollForTv(created.id);
    if (polled.status !== 'approved') {
      throw new Error('expected approved');
    }

    const first = await manager.redeemExchangeToken(polled.exchangeToken);
    expect(first).toEqual({ usuarioId: 'usuario-42' });

    const second = await manager.redeemExchangeToken(polled.exchangeToken);
    expect(second).toBeNull();
  });
});
