import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import {
  LOGIN_EMAIL_OTP_BLOQUEIO_MS,
  LOGIN_EMAIL_OTP_MAX_TENTATIVAS,
  LOGIN_EMAIL_OTP_TTL_MS,
  type LoginEmailOtpPurpose,
} from '@/lib/auth/email-otp/login-email-otp-constants';
import { LoginEmailOtpHasher } from '@/lib/auth/email-otp/login-email-otp-hasher';

type AdminClient = SupabaseClient<DatabaseComAuthz>;

export type LoginEmailOtpCreateResult = {
  code: string;
  expiresAt: string;
};

export type LoginEmailOtpValidateResult =
  | { ok: true; usuarioId: string }
  | {
      ok: false;
      reason: 'not_found' | 'expired' | 'blocked' | 'invalid' | 'wrong_purpose';
      message: string;
      tentativasRestantes?: number;
      bloqueadoAte?: Date;
    };

type OtpRow = {
  id: string;
  usuario_id: string;
  code_hash: string;
  purpose: string;
  expires_at: string;
  tentativas: number;
  bloqueado_ate: string | null;
};

/**
 * Ciclo de vida dos códigos OTP enviados por e-mail.
 */
export class LoginEmailOtpManager {
  constructor(
    private readonly supabase: AdminClient,
    private readonly hasher: LoginEmailOtpHasher = new LoginEmailOtpHasher(),
  ) {}

  async create(
    usuarioId: string,
    purpose: LoginEmailOtpPurpose,
  ): Promise<LoginEmailOtpCreateResult> {
    await this.deleteByUsuarioAndPurpose(usuarioId, purpose);

    const code = this.hasher.createCode();
    const expiresAt = new Date(Date.now() + LOGIN_EMAIL_OTP_TTL_MS).toISOString();

    const { error } = await this.supabase.from('login_email_otps').insert({
      usuario_id: usuarioId,
      code_hash: this.hasher.hash(code),
      purpose,
      expires_at: expiresAt,
      tentativas: 0,
      bloqueado_ate: null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { code, expiresAt };
  }

  async validateAndConsume(
    usuarioId: string,
    code: string,
    purpose: LoginEmailOtpPurpose,
  ): Promise<LoginEmailOtpValidateResult> {
    const row = await this.findLatest(usuarioId, purpose);
    if (!row) {
      return {
        ok: false,
        reason: 'not_found',
        message: 'Nenhum código foi solicitado',
      };
    }

    if (row.purpose !== purpose) {
      return {
        ok: false,
        reason: 'wrong_purpose',
        message: 'Código inválido para esta operação',
      };
    }

    if (row.bloqueado_ate) {
      const blockedUntil = new Date(row.bloqueado_ate);
      if (blockedUntil.getTime() > Date.now()) {
        return {
          ok: false,
          reason: 'blocked',
          message: 'Muitas tentativas incorretas. Tente novamente mais tarde.',
          bloqueadoAte: blockedUntil,
        };
      }
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.deleteById(row.id);
      return {
        ok: false,
        reason: 'expired',
        message: 'Código expirado. Solicite um novo código.',
      };
    }

    if (!this.hasher.matches(code, row.code_hash)) {
      return this.registerFailedAttempt(row);
    }

    await this.deleteById(row.id);
    return { ok: true, usuarioId: row.usuario_id };
  }

  private async findLatest(
    usuarioId: string,
    purpose: LoginEmailOtpPurpose,
  ): Promise<OtpRow | null> {
    const { data, error } = await this.supabase
      .from('login_email_otps')
      .select(
        'id, usuario_id, code_hash, purpose, expires_at, tentativas, bloqueado_ate',
      )
      .eq('usuario_id', usuarioId)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data as OtpRow | null;
  }

  private async registerFailedAttempt(
    row: OtpRow,
  ): Promise<LoginEmailOtpValidateResult> {
    const tentativas = (row.tentativas ?? 0) + 1;
    const tentativasRestantes = Math.max(
      0,
      LOGIN_EMAIL_OTP_MAX_TENTATIVAS - tentativas,
    );

    if (tentativas >= LOGIN_EMAIL_OTP_MAX_TENTATIVAS) {
      const bloqueadoAte = new Date(Date.now() + LOGIN_EMAIL_OTP_BLOQUEIO_MS);
      await this.supabase
        .from('login_email_otps')
        .update({
          tentativas,
          bloqueado_ate: bloqueadoAte.toISOString(),
        })
        .eq('id', row.id);

      return {
        ok: false,
        reason: 'blocked',
        message: 'Código incorreto. Você foi bloqueado por 15 minutos.',
        tentativasRestantes: 0,
        bloqueadoAte,
      };
    }

    await this.supabase
      .from('login_email_otps')
      .update({ tentativas })
      .eq('id', row.id);

    return {
      ok: false,
      reason: 'invalid',
      message: `Código incorreto. Você tem ${tentativasRestantes} tentativa(s) restante(s).`,
      tentativasRestantes,
    };
  }

  private async deleteByUsuarioAndPurpose(
    usuarioId: string,
    purpose: LoginEmailOtpPurpose,
  ): Promise<void> {
    await this.supabase
      .from('login_email_otps')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('purpose', purpose);
  }

  private async deleteById(id: string): Promise<void> {
    await this.supabase.from('login_email_otps').delete().eq('id', id);
  }
}
