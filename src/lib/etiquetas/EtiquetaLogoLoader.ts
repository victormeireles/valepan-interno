import fs from 'node:fs';
import path from 'node:path';

export class EtiquetaLogoLoader {
  private svg?: string;

  load(): string {
    if (this.svg !== undefined) return this.svg;
    try {
      const source = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-full-light.svg'), 'utf8');
      this.svg = this.normalize(source);
    } catch {
      this.svg = '';
    }
    return this.svg;
  }

  private normalize(source: string): string {
    let svg = source.replace(/<\?xml[^>]*\?>/i, '').trim();
    const width = svg.match(/<svg[^>]*\bwidth=["']([\d.]+)/i)?.[1] ?? '422';
    const height = svg.match(/<svg[^>]*\bheight=["']([\d.]+)/i)?.[1] ?? '301';
    if (!svg.includes('viewBox')) {
      svg = svg.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
    }
    svg = svg.replace(/(<svg[^>]*)\s+(?:width|height)=["'][^"']*["']/gi, '$1');
    svg = svg.replace(/(<svg[^>]*)\s+(?:width|height)=["'][^"']*["']/gi, '$1');
    if (!svg.includes('preserveAspectRatio')) {
      svg = svg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
    }
    return svg;
  }
}
