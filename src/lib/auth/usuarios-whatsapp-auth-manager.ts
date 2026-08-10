import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type WhatsAppCodeValidation = {
  valid: boolean;
  message: string;
  tentativasRestantes?: number;
  bloqueadoAte?: Date;
};

type UsuariosTable = Database['public']['Tables']['usuarios'];
export type UsuarioWhatsAppRow = UsuariosTable['Row'];

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

/**
 * Persistência e validação do OTP WhatsApp em `usuarios`.
 */
export class UsuariosWhatsAppAuthManager {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getByTelefone(telefone: string): Promise<UsuarioWhatsAppRow | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createWhatsAppCode(userId: string, code: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_TTL_MINUTES);

    const { error } = await this.supabase
      .from('usuarios')
      .update({
        codigo_whatsapp: code,
        codigo_whatsapp_expires: expiresAt.toISOString(),
        codigo_whatsapp_tentativas: 0,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async validateWhatsAppCode(
    userId: string,
    code: string,
  ): Promise<WhatsAppCodeValidation> {
    const { data: user, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) return { valid: false, message: 'Usuário não encontrado' };

    if (user.codigo_whatsapp_bloqueado_ate) {
      const blockedUntil = new Date(user.codigo_whatsapp_bloqueado_ate);
      if (new Date() < blockedUntil) {
        return {
          valid: false,
          message: 'Muitas tentativas incorretas. Tente novamente mais tarde.',
          bloqueadoAte: blockedUntil,
        };
      }
    }

    if (!user.codigo_whatsapp) {
      return { valid: false, message: 'Nenhum código foi solicitado' };
    }

    if (user.codigo_whatsapp_expires) {
      const expiresAt = new Date(user.codigo_whatsapp_expires);
      if (new Date() > expiresAt) {
        return {
          valid: false,
          message: 'Código expirado. Solicite um novo código.',
        };
      }
    }

    if (user.codigo_whatsapp !== code) {
      const tentativas = (user.codigo_whatsapp_tentativas ?? 0) + 1;
      const tentativasRestantes = Math.max(0, MAX_ATTEMPTS - tentativas);

      if (tentativas >= MAX_ATTEMPTS) {
        const bloqueadoAte = new Date();
        bloqueadoAte.setMinutes(bloqueadoAte.getMinutes() + BLOCK_MINUTES);

        await this.supabase
          .from('usuarios')
          .update({
            codigo_whatsapp_tentativas: tentativas,
            codigo_whatsapp_bloqueado_ate: bloqueadoAte.toISOString(),
          })
          .eq('id', userId);

        return {
          valid: false,
          message: 'Código incorreto. Você foi bloqueado por 15 minutos.',
          tentativasRestantes: 0,
          bloqueadoAte,
        };
      }

      await this.supabase
        .from('usuarios')
        .update({ codigo_whatsapp_tentativas: tentativas })
        .eq('id', userId);

      return {
        valid: false,
        message: `Código incorreto. Você tem ${tentativasRestantes} tentativa(s) restante(s).`,
        tentativasRestantes,
      };
    }

    return { valid: true, message: 'Código validado com sucesso' };
  }

  async clearWhatsAppCode(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('usuarios')
      .update({
        codigo_whatsapp: null,
        codigo_whatsapp_expires: null,
        codigo_whatsapp_tentativas: 0,
        codigo_whatsapp_bloqueado_ate: null,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async markTelefoneVerificado(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('usuarios')
      .update({ telefone_verificado: true })
      .eq('id', userId);

    if (error) throw error;
  }
}
