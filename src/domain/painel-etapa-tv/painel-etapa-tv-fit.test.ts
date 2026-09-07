import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PainelEtapaTvFit } from './painel-etapa-tv-fit';

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../components/PainelEtapaTv/painel-etapa-tv-kiosk.css',
);

describe('PainelEtapaTvFit', () => {
  it('1080p sem zoom entra em kiosk com escala 1', () => {
    expect(PainelEtapaTvFit.isKiosk(1920, 1080)).toBe(true);
    expect(PainelEtapaTvFit.scale(1920, 1080)).toBe(1);
  });

  it('1080p com zoom 200% (960×540) ainda é kiosk e escala pela metade', () => {
    expect(PainelEtapaTvFit.isKiosk(960, 540)).toBe(true);
    expect(PainelEtapaTvFit.scale(960, 540)).toBe(0.5);
  });

  it('abaixo de 1024px de largura — o corte antigo — continua kiosk', () => {
    expect(PainelEtapaTvFit.isKiosk(1023, 576)).toBe(true);
    expect(PainelEtapaTvFit.isKiosk(800, 500)).toBe(true);
  });

  it('celular retrato e paisagem baixa não entram em kiosk', () => {
    expect(PainelEtapaTvFit.isKiosk(390, 844)).toBe(false);
    expect(PainelEtapaTvFit.isKiosk(844, 390)).toBe(false);
  });

  it('media query combina largura, altura e landscape', () => {
    expect(PainelEtapaTvFit.mediaQuery()).toContain('min-width: 768px');
    expect(PainelEtapaTvFit.mediaQuery()).toContain('min-height: 480px');
    expect(PainelEtapaTvFit.mediaQuery()).toContain('orientation: landscape');
  });

  it('CSS do kiosk usa as mesmas medidas do canvas', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain(`min-width: ${PainelEtapaTvFit.MIN_WIDTH_PX}px`);
    expect(css).toContain(`min-height: ${PainelEtapaTvFit.MIN_HEIGHT_PX}px`);
    expect(css).toContain(`${PainelEtapaTvFit.DESIGN_WIDTH_PX}px`);
    expect(css).toContain(`${PainelEtapaTvFit.DESIGN_HEIGHT_PX}px`);
    expect(css).toContain('grid-template-columns');
  });
});
