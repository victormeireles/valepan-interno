import type { RemuneracaoPacote } from './remuneracao-pacote';

export type RemuneracaoVigencia = RemuneracaoPacote & { id: string };
export type MarcaRemuneracao = 'vigente' | 'futura' | null;
export type RemuneracaoLinhaVisivel = RemuneracaoVigencia & { marca: MarcaRemuneracao };

export class RemuneracaoQuadro {
  montar(vigencias: RemuneracaoVigencia[], hoje: string): {
    vigente: RemuneracaoVigencia | null;
    linhas: RemuneracaoLinhaVisivel[];
  } {
    const ordenadas = [...vigencias].sort((a, b) => b.inicio.localeCompare(a.inicio));
    const vigente = ordenadas.find((vigencia) => vigencia.inicio <= hoje) ?? null;
    return {
      vigente,
      linhas: ordenadas.map((vigencia) => ({ ...vigencia, marca: this.marca(vigencia, vigente, hoje) })),
    };
  }

  private marca(vigencia: RemuneracaoVigencia, vigente: RemuneracaoVigencia | null, hoje: string): MarcaRemuneracao {
    if (vigente?.id === vigencia.id) return 'vigente';
    if (vigencia.inicio > hoje) return 'futura';
    return null;
  }
}

export class RemuneracaoData {
  exibir(iso: string): string {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  confirmacao(iso: string): string {
    return `Apagar a vigência de ${this.exibir(iso)}?`;
  }
}
