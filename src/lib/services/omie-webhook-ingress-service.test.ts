import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/omie/OmieWebhookEventoRepository', () => ({
  omieWebhookEventoRepository: {},
  OmieWebhookEventoRepository: class {},
}));

import type { OmieWebhookEventoRepository } from '@/data/omie/OmieWebhookEventoRepository';
import { OmieWebhookIngressService } from './omie-webhook-ingress-service';

function createRepositoryMock(): OmieWebhookEventoRepository {
  return {
    findEmpresaByAppKey: vi.fn(),
    findByMessageId: vi.fn(),
    registrarEvento: vi.fn(),
  } as unknown as OmieWebhookEventoRepository;
}

describe('OmieWebhookIngressService', () => {
  it('registra evento de recebimento concluído', async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.findEmpresaByAppKey).mockResolvedValue({
      id: 'empresa-1',
      nome: 'Nova Resende',
      app_key: '123',
      app_secret: 'secret',
    });
    vi.mocked(repository.findByMessageId).mockResolvedValue(null);
    vi.mocked(repository.registrarEvento).mockResolvedValue({
      id: 'evento-1',
    } as never);

    const service = new OmieWebhookIngressService(repository);
    const result = await service.receberRecebimento({
      messageId: 'msg-1',
      topic: 'recebimentoproduto.concluido',
      appKey: '123',
    });

    expect(result).toEqual({ status: 'accepted', eventoId: 'evento-1' });
  });

  it('retorna duplicate quando messageId já existe', async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.findEmpresaByAppKey).mockResolvedValue({
      id: 'empresa-1',
      nome: 'Nova Resende',
      app_key: '123',
      app_secret: 'secret',
    });
    vi.mocked(repository.findByMessageId).mockResolvedValue({ id: 'evento-existente' } as never);

    const service = new OmieWebhookIngressService(repository);
    const result = await service.receberRecebimento({
      messageId: 'msg-1',
      topic: 'RecebimentoProduto.Concluido',
      appKey: '123',
    });

    expect(result).toEqual({ status: 'duplicate', eventoId: 'evento-existente' });
    expect(repository.registrarEvento).not.toHaveBeenCalled();
  });
});
