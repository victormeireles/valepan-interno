import { describe, expect, it } from 'vitest';
import { EtiquetaModeloManager } from '@/domain/etiquetas/etiqueta-modelo-manager';
import { etiquetaProdutoFixture as produto, etiquetaRequestFixture as request } from '@/domain/etiquetas/etiqueta-test-fixtures';
import { EtiquetaHtmlRenderer } from './EtiquetaHtmlRenderer';
import { EtiquetaViewModel } from './EtiquetaViewModel';

describe('EtiquetaHtmlRenderer', () => {
  const modelo = new EtiquetaModeloManager().build(request, produto, [
    { nome: 'Pão', unit_weight: 50 }, { nome: 'Pão', unit_weight: 65 },
  ]);
  const renderer = new EtiquetaHtmlRenderer();
  const assets = { logoSvg: '<svg viewBox="0 0 422 301"></svg>', fontCss: '', barcodeImage: 'data:image/png;base64,abc' };

  it('renderiza família, gramatura, logo, peso corrigido e prazos do modelo 3a', () => {
    const html = renderer.render(new EtiquetaViewModel(modelo), assets);
    expect(html).toContain('Brioche Gergelim <span class="title-highlight">Duo</span>');
    expect(html).toContain(assets.logoSvg);
    expect(html).toContain('3,120 kg');
    expect(html).toContain('03/09/2026');
    expect(html).toContain('AMBIENTE <strong>21 DIAS</strong>');
    expect(html).toContain('CONGELADO <strong>90 DIAS</strong>');
    expect(html).toContain('DESCONGELADO <strong>5 DIAS</strong>');
    expect(html.match(/class="weight-option selected"/g)).toHaveLength(1);
    expect(html).toContain('ESTA CAIXA');
    expect(html).toContain('609963303892');
  });

  it('escapa títulos, categoria e código sem executar texto do usuário', () => {
    const titulo = 'Pão <img src=x onerror=alert(1)> & "especial"';
    const html = renderer.render(new EtiquetaViewModel({ ...modelo, titulo, categoria: '<script>bad</script>' }), assets);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>bad</script>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;especial&quot;');
  });

  it('não destaca outra gramatura e omite código de barras indisponível', () => {
    const html = renderer.render(new EtiquetaViewModel({ ...modelo, gramatura: null }), {
      ...assets, barcodeImage: '',
    });
    expect(html).toContain('GRAMATURA NÃO INFORMADA');
    expect(html).not.toContain('class="weight-option selected"');
    expect(html).not.toContain('class="barcode"');
  });
});
