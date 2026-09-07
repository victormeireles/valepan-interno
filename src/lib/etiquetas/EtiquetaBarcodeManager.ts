export class EtiquetaBarcodeManager {
  async generate(code: string): Promise<string> {
    if (!code.trim()) return '';
    try {
      const [{ createCanvas }, { default: JsBarcode }] = await Promise.all([
        import('canvas'), import('jsbarcode'),
      ]);
      const canvas = createCanvas(4, 1);
      JsBarcode(canvas, code, {
        format: 'CODE128', width: 4, height: 140,
        displayValue: false, margin: 18,
      });
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }
}
