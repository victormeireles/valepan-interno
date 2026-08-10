import { describe, expect, it } from 'vitest';
import {
  generateVerificationCode,
  getMinutesUntilExpiration,
  whatsappCodeSchema,
} from '@/lib/validators/whatsapp';
import { UsuariosWhatsAppAuthManager } from '@/lib/auth/usuarios-whatsapp-auth-manager';

describe('whatsapp auth helpers', () => {
  it('gera código de 6 dígitos', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('valida schema de código', () => {
    expect(whatsappCodeSchema.safeParse('123456').success).toBe(true);
    expect(whatsappCodeSchema.safeParse('12345').success).toBe(false);
  });

  it('calcula minutos até expiração', () => {
    const inFive = new Date(Date.now() + 5 * 60_000);
    expect(getMinutesUntilExpiration(inFive)).toBeGreaterThanOrEqual(4);
  });
});

describe('UsuariosWhatsAppAuthManager.validateWhatsAppCode', () => {
  it('aceita código válido e rejeita expirado', async () => {
    const rows = {
      id: 'u1',
      codigo_whatsapp: '123456',
      codigo_whatsapp_expires: new Date(Date.now() + 60_000).toISOString(),
      codigo_whatsapp_tentativas: 0,
      codigo_whatsapp_bloqueado_ate: null,
    };

    const manager = new UsuariosWhatsAppAuthManager({
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: rows, error: null }),
                };
              },
            };
          },
        };
      },
    } as never);

    await expect(manager.validateWhatsAppCode('u1', '123456')).resolves.toMatchObject({
      valid: true,
    });

    rows.codigo_whatsapp_expires = new Date(Date.now() - 1000).toISOString();
    await expect(manager.validateWhatsAppCode('u1', '123456')).resolves.toMatchObject({
      valid: false,
      message: expect.stringContaining('expirado'),
    });
  });
});
