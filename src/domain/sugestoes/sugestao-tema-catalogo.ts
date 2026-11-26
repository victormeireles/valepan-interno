const TEMAS = [
  { valor: 'seguranca', rotulo: 'Segurança' },
  { valor: 'qualidade', rotulo: 'Qualidade' },
  { valor: 'organizacao', rotulo: 'Organização' },
  { valor: 'processos', rotulo: 'Processos' },
  { valor: 'eficiencia', rotulo: 'Eficiência' },
  { valor: 'seguranca_alimentos', rotulo: 'Segurança dos alimentos' },
  { valor: 'inovacao', rotulo: 'Inovação' },
] as const;

export type SugestaoTema = (typeof TEMAS)[number]['valor'];

export class SugestaoTemaCatalogo {
  opcoes(): { valor: SugestaoTema; rotulo: string }[] {
    return TEMAS.map((tema) => ({ valor: tema.valor, rotulo: tema.rotulo }));
  }

  aceita(valor: string): valor is SugestaoTema {
    return TEMAS.some((tema) => tema.valor === valor);
  }

  rotulo(valor: string): string {
    return TEMAS.find((tema) => tema.valor === valor)?.rotulo ?? valor;
  }
}
