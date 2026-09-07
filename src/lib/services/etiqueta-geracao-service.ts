import { EtiquetaProdutoRepository } from '@/data/etiquetas/EtiquetaProdutoRepository';
import type { EtiquetaProdutoRepositoryPort, GerarEtiquetaRequest } from '@/domain/etiquetas/etiqueta-geracao-types';
import { EtiquetaModeloManager } from '@/domain/etiquetas/etiqueta-modelo-manager';
import { EtiquetaBarcodeManager } from '@/lib/etiquetas/EtiquetaBarcodeManager';
import { EtiquetaFontLoader } from '@/lib/etiquetas/EtiquetaFontLoader';
import { EtiquetaHtmlRenderer } from '@/lib/etiquetas/EtiquetaHtmlRenderer';
import { EtiquetaLogoLoader } from '@/lib/etiquetas/EtiquetaLogoLoader';
import { EtiquetaViewModel } from '@/lib/etiquetas/EtiquetaViewModel';

export class EtiquetaProdutoNaoEncontradoError extends Error {
  constructor() { super('Produto não encontrado'); }
}

export class EtiquetaGeracaoService {
  constructor(
    private readonly repository: EtiquetaProdutoRepositoryPort = new EtiquetaProdutoRepository(),
    private readonly modeloManager = new EtiquetaModeloManager(),
    private readonly renderer = new EtiquetaHtmlRenderer(),
    private readonly barcodeManager: Pick<EtiquetaBarcodeManager, 'generate'> = new EtiquetaBarcodeManager(),
    private readonly fontLoader: Pick<EtiquetaFontLoader, 'load'> = new EtiquetaFontLoader(),
    private readonly logoLoader: Pick<EtiquetaLogoLoader, 'load'> = new EtiquetaLogoLoader(),
  ) {}

  async gerar(request: GerarEtiquetaRequest): Promise<string> {
    const produto = await this.repository.findProduto(request);
    if (!produto) throw new EtiquetaProdutoNaoEncontradoError();
    const [pesosCategoria, barcodeImage] = await Promise.all([
      produto.categoriaId ? this.repository.listPesosCategoria(produto.categoriaId) : [],
      this.barcodeManager.generate(produto.codigoBarras?.trim() ?? ''),
    ]);
    const modelo = this.modeloManager.build(request, produto, pesosCategoria);
    return this.renderer.render(new EtiquetaViewModel(modelo), {
      barcodeImage,
      fontCss: this.fontLoader.load(),
      logoSvg: this.logoLoader.load(),
    });
  }
}
