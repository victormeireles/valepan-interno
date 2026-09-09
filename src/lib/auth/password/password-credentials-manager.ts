import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import {
  formatPhoneNumber,
  isValidBrazilianPhone,
} from '@/lib/validators/whatsapp';
import { PasswordHasher } from '@/lib/auth/password/password-hasher';

type AdminClient = SupabaseClient<DatabaseComAuthz>;

export type PasswordAuthUser = {
  id: string;
  email: string;
  name: string;
  passwordMustChange: boolean;
};

export type PasswordCredentialsResult =
  | { ok: true; user: PasswordAuthUser }
  | { ok: false; reason: 'not_found' | 'inactive' | 'no_password' | 'invalid' };

type UsuarioPasswordRow = {
  id: string;
  email: string | null;
  nome: string;
  ativo: boolean;
  password_hash: string | null;
  password_must_change: boolean;
};

/**
 * Autenticação por e-mail ou telefone + senha.
 */
export class PasswordCredentialsManager {
  constructor(
    private readonly supabase: AdminClient,
    private readonly hasher: PasswordHasher = new PasswordHasher(),
  ) {}

  async authenticate(
    identifier: string,
    password: string,
  ): Promise<PasswordCredentialsResult> {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      return { ok: false, reason: 'not_found' };
    }
    if (user.ativo === false) {
      return { ok: false, reason: 'inactive' };
    }
    if (!user.password_hash) {
      return { ok: false, reason: 'no_password' };
    }
    if (!this.hasher.verify(password, user.password_hash)) {
      return { ok: false, reason: 'invalid' };
    }

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.nome,
        passwordMustChange: user.password_must_change === true,
      },
    };
  }

  async setPassword(
    usuarioId: string,
    plainPassword: string,
    options?: { mustChange?: boolean },
  ): Promise<void> {
    const passwordHash = this.hasher.hash(plainPassword);
    const { error } = await this.supabase
      .from('usuarios')
      .update({
        password_hash: passwordHash,
        password_must_change: options?.mustChange === true,
        password_updated_at: new Date().toISOString(),
      })
      .eq('id', usuarioId);

    if (error) {
      throw new Error(error.message);
    }
  }

  private async findByIdentifier(
    identifier: string,
  ): Promise<UsuarioPasswordRow | null> {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed.toLowerCase());
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && isValidBrazilianPhone(trimmed)) {
      return this.findByTelefone(formatPhoneNumber(trimmed));
    }

    if (digitsOnly.length >= 10) {
      return this.findByTelefone(formatPhoneNumber(digitsOnly));
    }

    return this.findByEmail(trimmed.toLowerCase());
  }

  private async findByEmail(email: string): Promise<UsuarioPasswordRow | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, email, nome, ativo, password_hash, password_must_change')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data as UsuarioPasswordRow | null;
  }

  private async findByTelefone(
    telefone: string,
  ): Promise<UsuarioPasswordRow | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, email, nome, ativo, password_hash, password_must_change')
      .eq('telefone', telefone)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data as UsuarioPasswordRow | null;
  }
}
