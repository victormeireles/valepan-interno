export class TurnoCodigo {
  gerar(setorCodigo: string, nome: string, usados: string[]): string {
    const base = `${setorCodigo}-${this.slug(nome)}`;
    if (!usados.includes(base)) return base;
    let sequencia = 2;
    while (usados.includes(`${base}${sequencia}`)) sequencia += 1;
    return `${base}${sequencia}`;
  }

  private slug(nome: string): string {
    const limpo = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return (limpo || 'NOVO').slice(0, 6);
  }
}
