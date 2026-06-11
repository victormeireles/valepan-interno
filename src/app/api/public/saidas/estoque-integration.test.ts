import { describe, expect, it, vi, beforeEach } from 'vitest';

const registrarSaidaMock = vi.fn(async () => ({
  id: 'mov-1',
  data: '2026-06-02',
  cliente: 'Cliente A',
  produto: 'Pao Brioche',
  observacao: '',
  meta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
  realizado: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
  createdAt: '2026-06-02T12:00:00.000Z',
  updatedAt: '2026-06-02T12:00:00.000Z',
}));

const findMatchingMock = vi.fn(async () => [
  {
    id: 'mov-1',
    data: '2026-06-02',
    cliente: 'Cliente A',
    produto: 'Pao Brioche',
    observacao: '',
    meta: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
    realizado: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
    createdAt: '2026-06-02T12:00:00.000Z',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
]);

const estornarSaidaMock = vi.fn(async () => findMatchingMock.mock.results[0]?.value);

vi.mock('@/lib/services/api-key-auth-service', () => ({
  apiKeyAuthService: { validateRequest: vi.fn(() => true) },
}));

vi.mock('@/lib/services/whatsapp-notification-service', () => ({
  whatsAppNotificationService: { notifySaidasProduction: vi.fn(async () => undefined) },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/services/saida-movimento-service', () => ({
  saidaMovimentoService: {
    registrarSaida: (...args: unknown[]) => registrarSaidaMock(...args),
    findMatching: (...args: unknown[]) => findMatchingMock(...args),
    estornarSaida: (...args: unknown[]) => estornarSaidaMock(...args),
  },
}));

describe('POST /api/public/saidas estoque', () => {
  beforeEach(() => {
    registrarSaidaMock.mockClear();
  });

  it('registra saída via movimento de estoque', async () => {
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
    expect(registrarSaidaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: 'Cliente A',
        produto: 'Pao Brioche',
        quantidade: { caixas: 2, pacotes: 0, unidades: 0, kg: 0 },
      }),
    );
  });
});

describe('DELETE /api/public/saidas/delete estoque', () => {
  beforeEach(() => {
    findMatchingMock.mockClear();
    estornarSaidaMock.mockClear();
  });

  it('estorna saída encontrada no ledger', async () => {
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
    expect(estornarSaidaMock).toHaveBeenCalledWith('mov-1');
  });
});
