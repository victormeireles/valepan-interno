export type FilaItem = {
  numero: number;
  tipo: 'corretiva' | 'preventiva';
  urgencia: string | null;
  status: 'aberta' | 'recebida' | 'finalizada';
  abertaEm: string;
  fimEm: string | null;
};

const GRUPO_URGENCIA: Record<string, number> = {
  maquina_parou: 0,
  oferecendo_risco: 1,
  trabalhando_com_problema: 2,
};

const GRUPO_PREVENTIVA = 3;
const GRUPO_DESCONHECIDO = 4;
const GRUPO_FINALIZADA = 100;

export class FilaOrdem {
  ordenar(itens: FilaItem[]): FilaItem[] {
    return [...itens].sort((esquerda, direita) => this.comparar(esquerda, direita));
  }

  private comparar(esquerda: FilaItem, direita: FilaItem): number {
    const porGrupo = this.grupo(esquerda) - this.grupo(direita);
    if (porGrupo !== 0) return porGrupo;
    if (esquerda.status === 'finalizada' && direita.status === 'finalizada') {
      return this.instante(direita.fimEm ?? direita.abertaEm) - this.instante(esquerda.fimEm ?? esquerda.abertaEm);
    }
    return this.instante(esquerda.abertaEm) - this.instante(direita.abertaEm);
  }

  private grupo(item: FilaItem): number {
    if (item.status === 'finalizada') return GRUPO_FINALIZADA;
    if (item.tipo === 'preventiva') return GRUPO_PREVENTIVA;
    if (!item.urgencia) return GRUPO_DESCONHECIDO;
    return GRUPO_URGENCIA[item.urgencia] ?? GRUPO_DESCONHECIDO;
  }

  private instante(iso: string): number {
    return Date.parse(iso);
  }
}
