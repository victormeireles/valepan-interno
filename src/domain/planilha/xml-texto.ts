export class XmlTexto {
  escapar(valor: string): string {
    return this.limpar(valor)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  atributo(valor: string): string {
    return this.escapar(valor).replaceAll('"', '&quot;');
  }

  private limpar(valor: string): string {
    return valor.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
}
