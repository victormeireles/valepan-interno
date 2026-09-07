const STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: white; color: #000; font-family: 'Manrope', sans-serif;
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; padding: 20px;
}
.etiqueta {
  width: 900px; height: 600px; flex-shrink: 0; padding: 16px 20px;
  border: 2px solid #000; background: #fff;
  display: grid; grid-template-rows: 112px 151px 136px 1fr; gap: 9px;
  print-color-adjust: exact; -webkit-print-color-adjust: exact;
}
.header {
  display: grid; grid-template-columns: 180px 125px minmax(0, 1fr);
  gap: 20px; align-items: end; border-bottom: 3px solid #000; padding-bottom: 9px;
}
.logo-container { width: 165px; height: 98px; }
.logo-container svg {
  display: block; width: 100%; height: 100%; filter: brightness(0);
}
.logo-container svg path { fill: #000 !important; stroke: #000 !important; }
.brand-name { font: 60px/1 'Bebas Neue', sans-serif; }
.header-field { text-align: right; }
.eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .14em; }
.header-value { font-size: 62px; font-weight: 800; line-height: 1.05; white-space: nowrap; }
.lot-value { font-family: 'Roboto Mono', monospace; }
.family { min-width: 0; }
.category { font-size: 16px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.title-container { height: 125px; display: flex; align-items: center; }
.family-title {
  width: 100%; font: 124px/.98 'Bebas Neue', sans-serif;
  text-transform: uppercase; white-space: nowrap;
}
.title-highlight {
  display: inline-block; background: #000; color: #fff;
  padding: 0 .075em; white-space: nowrap;
}
.weight-section { border-top: 3px solid #000; border-bottom: 3px solid #000; padding: 8px 0; }
.weight-heading { text-transform: uppercase; margin-bottom: 6px; }
.weight-scale { display: flex; align-items: flex-end; gap: 10px; }
.weight-option { flex: 1 1 0; min-width: 0; text-align: center; }
.weight-bar {
  height: 38px; border: 2px solid #000; display: flex;
  align-items: center; justify-content: center;
  font: 28px/1 'Bebas Neue', sans-serif; color: #b5b5b5; text-transform: uppercase;
}
.weight-option.selected .weight-bar { height: 70px; background: #000; color: #fff; font-size: 54px; }
.weight-marker { height: 17px; padding-top: 2px; font-size: 10px; font-weight: 800; letter-spacing: .06em; }
.weight-missing { font-size: 12px; font-weight: 800; margin-top: 5px; }
.footer { display: grid; grid-template-columns: 1.16fr .96fr 1fr; gap: 18px; align-items: end; min-width: 0; }
.box-details { display: flex; flex-direction: column; gap: 4px; }
.box-details p { font-size: 15px; font-weight: 700; white-space: nowrap; }
.box-details strong { font-size: 23px; font-weight: 800; }
.shelf-life { font-size: 13px; font-weight: 600; line-height: 1.55; }
.shelf-life p { white-space: nowrap; }
.shelf-life strong { font-size: 18px; font-weight: 800; }
.shelf-life .eyebrow { font-size: 11px; }
.barcode { min-width: 0; text-align: center; }
.barcode-image { width: 100%; height: 76px; display: block; object-fit: fill; }
.barcode-number { font: 700 18px/1.3 'Roboto Mono', monospace; letter-spacing: .03em; white-space: nowrap; }
@page { size: 900px 600px; margin: 0; }
@media print {
  html, body { width: 900px; height: 600px; min-height: 0; padding: 0; margin: 0; }
  body { display: block; }
  .etiqueta { margin: 0; break-inside: avoid; }
}
`;

export class EtiquetaStyles {
  render(): string { return STYLES; }
}
