import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: vi.fn(),
  },
}));

import {
  DEFAULT_WHATSAPP_CONFIG,
  isNotificationTypeEnabled,
  mapRowToSnapshot,
  type WhatsAppConfigSnapshot,
} from './whatsapp-config-service';

describe('mapRowToSnapshot', () => {
  it('mapeia colunas do banco para API', () => {
    const snapshot = mapRowToSnapshot({
      embalagem_habilitado: true,
      fermentacao_habilitado: false,
      forno_habilitado: true,
      saidas_habilitado: false,
      updated_at: '2026-06-02T10:00:00.000Z',
    });
    expect(snapshot).toEqual({
      embalagem: true,
      fermentacao: false,
      forno: true,
      saidas: false,
      updatedAt: '2026-06-02T10:00:00.000Z',
    });
  });
});

describe('isNotificationTypeEnabled', () => {
  const allOff: WhatsAppConfigSnapshot = { ...DEFAULT_WHATSAPP_CONFIG, updatedAt: null };

  it('retorna false quando tipo está desligado', () => {
    expect(isNotificationTypeEnabled(allOff, 'embalagem')).toBe(false);
    expect(isNotificationTypeEnabled(allOff, 'saidas')).toBe(false);
  });

  it('retorna true apenas para o tipo ligado', () => {
    const snap: WhatsAppConfigSnapshot = {
      embalagem: true,
      fermentacao: false,
      forno: false,
      saidas: false,
      updatedAt: null,
    };
    expect(isNotificationTypeEnabled(snap, 'embalagem')).toBe(true);
    expect(isNotificationTypeEnabled(snap, 'forno')).toBe(false);
  });
});
