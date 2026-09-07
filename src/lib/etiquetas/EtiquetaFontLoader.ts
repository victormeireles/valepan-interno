import fs from 'node:fs';
import path from 'node:path';

export class EtiquetaFontLoader {
  private css?: string;

  load(): string {
    this.css ??= [
      this.fontFace('Bebas Neue', 'BebasNeue.ttf', '400'),
      this.fontFace('Manrope', 'Manrope.ttf', '200 800'),
      this.fontFace('Roboto Mono', 'RobotoMono.ttf', '100 700'),
    ].join('\n');
    return this.css;
  }

  private fontFace(family: string, filename: string, weight: string): string {
    const font = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'etiquetas', filename));
    return `@font-face {
      font-family: '${family}'; font-style: normal; font-weight: ${weight};
      font-display: block;
      src: url(data:font/ttf;base64,${font.toString('base64')}) format('truetype');
    }`;
  }
}
