import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { LOGIN_QR_TTL_MS } from '@/lib/auth/qr/login-qr-constants';
import { LoginQrTokenHasher } from '@/lib/auth/qr/login-qr-token-hasher';

export type LoginQrStatus = 'pending' | 'approved' | 'consumed' | 'expired';

export type LoginQrCreateResult = {
  id: string;
  expiresAt: string;
  approvePath: string;
};

export type LoginQrStatusResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'consumed' }
  | { status: 'approved'; exchangeToken: string };

export type LoginQrApproveResult =
  | { ok: true }
  | { ok: false; reason: string };

type LoginQrRow = Database['public']['Tables']['login_qr_requests']['Row'];

type AdminClient = SupabaseClient<Database>;

/**
 * Ciclo de vida dos pedidos de login por QR (TV ↔ celular).
 */
export class LoginQrRequestManager {
  constructor(
    private readonly supabase: AdminClient,
    private readonly hasher: LoginQrTokenHasher = new LoginQrTokenHasher(),
  ) {}

  async create(): Promise<LoginQrCreateResult> {
    const expiresAt = new Date(Date.now() + LOGIN_QR_TTL_MS).toISOString();
    const { data, error } = await this.supabase
      .from('login_qr_requests')
      .insert({
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Falha ao criar pedido QR');
    }

    return {
      id: data.id,
      expiresAt: data.expires_at,
      approvePath: `/login/qr/aprovar?id=${data.id}`,
    };
  }

  async approve(id: string, usuarioId: string): Promise<LoginQrApproveResult> {
    const row = await this.findById(id);
    if (!row) {
      return { ok: false, reason: 'not_found' };
    }

    if (row.status === 'expired' || this.isExpired(row)) {
      if (row.status === 'pending') {
        await this.markExpired(id);
      }
      return { ok: false, reason: 'expired' };
    }

    if (row.status !== 'pending') {
      return { ok: false, reason: 'already_used' };
    }

    const approvedAt = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('login_qr_requests')
      .update({
        status: 'approved',
        usuario_id: usuarioId,
        approved_at: approvedAt,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return { ok: false, reason: 'already_used' };
    }

    return { ok: true };
  }

  async pollForTv(id: string): Promise<LoginQrStatusResult> {
    const row = await this.findById(id);
    if (!row) {
      return { status: 'expired' };
    }

    if (row.status === 'expired') {
      return { status: 'expired' };
    }

    if (row.status === 'consumed') {
      return { status: 'consumed' };
    }

    if (row.status === 'pending') {
      if (this.isExpired(row)) {
        await this.markExpired(id);
        return { status: 'expired' };
      }
      return { status: 'pending' };
    }

    if (row.status === 'approved') {
      if (this.isExpired(row)) {
        await this.markExpired(id);
        return { status: 'expired' };
      }
      return this.consumeApprovedForTv(id);
    }

    return { status: 'expired' };
  }

  async redeemExchangeToken(
    exchangeToken: string,
  ): Promise<{ usuarioId: string } | null> {
    const tokenHash = this.hasher.hash(exchangeToken);
    const { data: row, error } = await this.supabase
      .from('login_qr_requests')
      .select('id, usuario_id, exchange_token_hash, status')
      .eq('exchange_token_hash', tokenHash)
      .eq('status', 'consumed')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!row || !row.usuario_id || !row.exchange_token_hash) {
      return null;
    }

    const { data: cleared, error: clearError } = await this.supabase
      .from('login_qr_requests')
      .update({ exchange_token_hash: null })
      .eq('id', row.id)
      .eq('exchange_token_hash', tokenHash)
      .select('usuario_id')
      .maybeSingle();

    if (clearError) {
      throw new Error(clearError.message);
    }
    if (!cleared?.usuario_id) {
      return null;
    }

    return { usuarioId: cleared.usuario_id };
  }

  private async consumeApprovedForTv(
    id: string,
  ): Promise<LoginQrStatusResult> {
    const exchangeToken = this.hasher.createToken();
    const tokenHash = this.hasher.hash(exchangeToken);
    const consumedAt = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('login_qr_requests')
      .update({
        status: 'consumed',
        exchange_token_hash: tokenHash,
        consumed_at: consumedAt,
      })
      .eq('id', id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return { status: 'consumed' };
    }

    return { status: 'approved', exchangeToken };
  }

  private async findById(id: string): Promise<LoginQrRow | null> {
    const { data, error } = await this.supabase
      .from('login_qr_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  private isExpired(row: LoginQrRow): boolean {
    return new Date(row.expires_at).getTime() <= Date.now();
  }

  private async markExpired(id: string): Promise<void> {
    await this.supabase
      .from('login_qr_requests')
      .update({ status: 'expired' })
      .eq('id', id)
      .in('status', ['pending', 'approved']);
  }
}
