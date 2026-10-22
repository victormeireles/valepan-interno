export class SetorCodigo {
  gerar(nome: string, usados: string[]): string {
    const base = this.slug(nome).slice(0, 3) || 'SET';
    if (!usados.includes(base)) return base;
    let sequencia = 2;
    while (usados.includes(`${base}${sequencia}`)) sequencia += 1;
    return `${base}${sequencia}`;
  }

  private slug(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }
}
