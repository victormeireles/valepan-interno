import { describe, expect, it, vi } from 'vitest';
import { EtiquetaGerarCoordinator, type EtiquetaRegistroInput } from './EtiquetaGerarCoordinator';
import { buildLegacyEtiquetaGerarBody } from '@/domain/etiquetas/etiqueta-legacy-payload';

const body = buildLegacyEtiquetaGerarBody({
  produtoId: 'produto-id', produtoNome: 'Produto', tipoEstoqueNome: 'Estoque', dataFabricacao: '2026-09-03',
  resolved: { nomeEtiqueta: 'Família', diasValidade: 21, diasValidadeCongelado: 90, congelado: false, mostrarTextoCongelado: false, lote: 246 },
});
const registro: EtiquetaRegistroInput = {
  produtoId: 'produto-id', tipoEstoqueId: 'estoque-id', dataFabricacao: '2026-09-03', modo: 'manual',
};

describe('EtiquetaGerarCoordinator', () => {
  it.each(['manual', 'pedido'] as const)('gera e registra no modo %s', async (modo) => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ html: '<html>Etiqueta</html>' }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const openHtml = vi.fn();
    await new EtiquetaGerarCoordinator(request, openHtml).gerar(body, { ...registro, modo });
    expect(openHtml).toHaveBeenCalledWith('<html>Etiqueta</html>');
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).produtoId).toBe('produto-id');
    expect(request.mock.calls[1][0]).toBe('/api/etiquetas/registrar');
    expect(JSON.parse(String(request.mock.calls[1][1]?.body)).modo).toBe(modo);
  });

  it('reimprime sem registrar novamente', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ html: 'Etiqueta' }));
    await new EtiquetaGerarCoordinator(request, vi.fn()).gerar(body);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('não abre nem registra uma geração que falhou', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: 'Produto não encontrado' }, { status: 404 }));
    const openHtml = vi.fn();
    await expect(new EtiquetaGerarCoordinator(request, openHtml).gerar(body, registro)).rejects.toThrow('Produto não encontrado');
    expect(openHtml).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
