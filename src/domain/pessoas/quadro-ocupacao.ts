import type { QuadroNumeros } from './quadro-montagem';

export type QuadroOcupacaoSegmentos = {
  noPosto: number;
  avisos: number;
  reservas: number;
  livres: number;
  livresAposSaidas: number;
};

export class QuadroOcupacao {
  segmentos(numeros: QuadroNumeros): QuadroOcupacaoSegmentos {
    const reservas = Math.max(numeros.reservas, 0);
    const livres = Math.max(numeros.livres, 0);
    const ocupados = Math.max(numeros.aprovado - reservas - livres, 0);
    const avisos = Math.min(Math.max(numeros.avisos, 0), ocupados);
    return {
      noPosto: ocupados - avisos,
      avisos,
      reservas,
      livres,
      livresAposSaidas: livres + avisos,
    };
  }
}
