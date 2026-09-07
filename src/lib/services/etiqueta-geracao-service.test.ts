import { describe, expect, it, vi } from 'vitest';
import { EtiquetaGeracaoService, EtiquetaProdutoNaoEncontradoError } from './etiqueta-geracao-service';
import { etiquetaProdutoFixture as produto, etiquetaRequestFixture as request } from '@/domain/etiquetas/etiqueta-test-fixtures';

describe('EtiquetaGeracaoService', () => {
  it('integra dados, régua da categoria e conteúdo editado no HTML', async () => {
    const repository = {
      findProduto: vi.fn().mockResolvedValue(produto),
      listPesosCategoria: vi.fn().mockResolvedValue([{ nome: 'Pão', unit_weight: 50 }]),
    };
    const service = new EtiquetaGeracaoService(repository, undefined, undefined,
      { generate: vi.fn().mockResolvedValue('data:image/png;base64,abc') },
      { load: () => '@font-face {font-family: Manrope;}' }, { load: () => '<svg></svg>' },
    );
    const html = await service.gerar({ ...request, nomeEtiqueta: 'Smash Brioche' });
    expect(repository.listPesosCategoria).toHaveBeenCalledWith(produto.categoriaId);
    expect(html).toContain('Smash <span class="title-highlight">Brioche</span>');
    expect(html).toContain('>50g</div>');
    expect(html).toContain('>65g</div>');
    expect(html).toContain('3,120 kg');
  });

  it('não renderiza quando o produto não existe', async () => {
    const repository = { findProduto: vi.fn().mockResolvedValue(null), listPesosCategoria: vi.fn() };
    const service = new EtiquetaGeracaoService(repository);
    await expect(service.gerar(request)).rejects.toBeInstanceOf(EtiquetaProdutoNaoEncontradoError);
    expect(repository.listPesosCategoria).not.toHaveBeenCalled();
  });
});
