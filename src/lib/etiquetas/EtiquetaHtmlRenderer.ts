import { EtiquetaFitScript } from './EtiquetaFitScript';
import { EtiquetaStyles } from './EtiquetaStyles';
import type { EtiquetaViewModel } from './EtiquetaViewModel';

export type EtiquetaAssets = { logoSvg: string; fontCss: string; barcodeImage: string };

export class EtiquetaHtmlRenderer {
  constructor(
    private readonly styles = new EtiquetaStyles(),
    private readonly fitScript = new EtiquetaFitScript(),
  ) {}

  render(view: EtiquetaViewModel, assets: EtiquetaAssets): string {
    return `<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etiqueta - ${this.escape(view.titulo)}</title>
  <style>${assets.fontCss}\n${this.styles.render()}</style>
</head><body>
  <main class="etiqueta" aria-label="Etiqueta de caixa">
    ${this.header(view, assets.logoSvg)}
    ${this.family(view)}
    ${this.weights(view)}
    ${this.footer(view, assets.barcodeImage)}
  </main>
  <script>${this.fitScript.render()}</script>
</body></html>`;
  }

  private header(view: EtiquetaViewModel, logoSvg: string): string {
    return `<header class="header">
      ${logoSvg ? `<div class="logo-container">${logoSvg}</div>` : '<div class="brand-name">VALEPAN</div>'}
      <div class="header-field"><div class="eyebrow">LOTE</div>
        <div class="header-value lot-value" data-fit-width="62">${this.escape(view.lote)}</div></div>
      <div class="header-field"><div class="eyebrow">FABRICAÇÃO</div>
        <div class="header-value" data-fit-width="62">${this.escape(view.dataFabricacao)}</div></div>
    </header>`;
  }

  private family(view: EtiquetaViewModel): string {
    const prefixo = view.prefixo ? `${this.escape(view.prefixo)} ` : '';
    return `<section class="family">
      <p class="category" data-fit-width="16">${this.escape(view.categoria)}</p>
      <div class="title-container"><h1 class="family-title">${prefixo}<span class="title-highlight">${this.escape(view.destaque)}</span></h1></div>
    </section>`;
  }

  private weights(view: EtiquetaViewModel): string {
    const options = view.gramaturas.map((gramatura) => `
      <div class="weight-option${gramatura.selecionada ? ' selected' : ''}">
        <div class="weight-bar" data-fit-width="${gramatura.selecionada ? 54 : 28}">${this.escape(gramatura.texto)}</div>
        <div class="weight-marker">${gramatura.selecionada ? 'ESTA CAIXA' : '&nbsp;'}</div>
      </div>`).join('');
    return `<section class="weight-section" aria-label="Gramaturas da categoria">
      <p class="eyebrow weight-heading">GRAMATURA · ${this.escape(view.categoria)}</p>
      <div class="weight-scale">${options}</div>
      ${view.gramaturaInformada ? '' : '<p class="weight-missing">GRAMATURA NÃO INFORMADA</p>'}
    </section>`;
  }

  private footer(view: EtiquetaViewModel, barcodeImage: string): string {
    return `<footer class="footer">
      <div class="box-details">
        <p>PESO LÍQUIDO <strong>${this.escape(view.pesoLiquido)} kg</strong></p>
        <p>PÃES / CAIXA <strong>${this.escape(view.unidadesPorCaixa)}</strong></p>
        <p>PACOTES / CAIXA <strong>${this.escape(view.pacotesPorCaixa)}</strong></p>
      </div>
      <div class="shelf-life">
        <div class="eyebrow">VALIDADE</div>
        <p>AMBIENTE <strong>${this.escape(view.diasValidadeAmbiente)} DIAS</strong></p>
        <p>CONGELADO <strong>90 DIAS</strong></p>
        <p>DESCONGELADO <strong>5 DIAS</strong></p>
      </div>
      ${barcodeImage ? `<div class="barcode">
        <img class="barcode-image" src="${this.escape(barcodeImage)}" alt="Código de barras">
        <div class="barcode-number" data-fit-width="18">${this.escape(view.codigoBarras)}</div>
      </div>` : ''}
    </footer>`;
  }

  private escape(value: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, (character) => entities[character]);
  }
}
