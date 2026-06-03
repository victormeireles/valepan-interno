import { describe, expect, it, vi, beforeEach } from 'vitest';

const aplicarDeltaMock = vi.fn(async () => ({
  cliente: 'Estoque X',
  produto: 'Pao Brioche',
  quantidade: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
  atualizadoEm: new Date().toISOString(),
}));

const listByDateMock = vi.fn(async () => [
  {
    rowIndex: 5,
    cliente: 'Cliente A',
    produto: 'Pao Brioche',
    data: '2026-06-02',
    meta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
    realizado: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
  },
]);

vi.mock('@/lib/services/api-key-auth-service', () => ({
  apiKeyAuthService: { validateRequest: vi.fn(() => true) },
}));

vi.mock('@/lib/managers/saidas-sheet-manager', () => ({
  saidasSheetManager: {
    appendNovaSaida: vi.fn(async () => undefined),
    listByDate: (...args: unknown[]) => listByDateMock(...args),
    deleteRow: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/services/whatsapp-notification-service', () => ({
  whatsAppNotificationService: { notifySaidasProduction: vi.fn(async () => undefined) },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/services/estoque-service', () => ({
  estoqueService: {
    obterTipoEstoqueCliente: vi.fn(async () => 'Estoque X'),
    aplicarDelta: (...args: unknown[]) => aplicarDeltaMock(...args),
  },
}));

describe('POST /api/public/saidas estoque', () => {
  beforeEach(() => {
    aplicarDeltaMock.mockClear();
  });

  it('debita estoque com origem saida e allowNegative', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/public/saidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
      body: JSON.stringify({
        data: '2026-06-02',
        cliente: 'Cliente A',
        produto: 'Pao Brioche',
        meta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(aplicarDeltaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allowNegative: true,
        origem: 'saida',
        delta: expect.objectContaining({ caixas: -2 }),
      }),
    );
  });
});

describe('DELETE /api/public/saidas/delete estoque', () => {
  beforeEach(() => {
    aplicarDeltaMock.mockClear();
    listByDateMock.mockClear();
  });

  it('estorna estoque com origem saida quando havia realizado', async () => {
    const { DELETE } = await import('./delete/route');
    const req = new Request('http://localhost/api/public/saidas/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
      body: JSON.stringify({
        data: '2026-06-02',
        cliente: 'Cliente A',
        produto: 'Pao Brioche',
        quantidade: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
      }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(aplicarDeltaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
        allowNegative: true,
        origem: 'saida',
      }),
    );
  });
});
