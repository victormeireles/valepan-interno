export type ServicoPeriodo = { inicio: string; fim: string };

export class ExtraConflito {
  classificar(existentes: ServicoPeriodo[], inicio: string, fim: string): 'exato' | 'sobreposicao' | 'livre' {
    if (existentes.some((item) => item.inicio === inicio && item.fim === fim)) return 'exato';
    const ini = new Date(inicio).getTime();
    const end = new Date(fim).getTime();
    const cruza = existentes.some((item) => ini < new Date(item.fim).getTime() && end > new Date(item.inicio).getTime());
    return cruza ? 'sobreposicao' : 'livre';
  }
}
