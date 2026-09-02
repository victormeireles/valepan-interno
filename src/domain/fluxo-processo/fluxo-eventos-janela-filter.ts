import {
  JanelaOperacionalResolver,
  type JanelaOperacional,
} from '@/domain/producao-turno/janela-operacional';

type ComProduzidoEm = { produzidoEm: string };

/** Recorta apontamentos ao [ini, fim) da janela da própria etapa. */
export class FluxoEventosJanelaFilter {
  constructor(private readonly resolver = new JanelaOperacionalResolver()) {}

  filter<T extends ComProduzidoEm>(eventos: T[], janela: JanelaOperacional): T[] {
    return eventos.filter((evento) => {
      const ms = Date.parse(evento.produzidoEm);
      if (Number.isNaN(ms)) return false;
      return this.resolver.contains(ms, janela);
    });
  }
}
