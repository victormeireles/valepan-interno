export type FilaItem = {
  numero: number;
  tipo: 'corretiva' | 'preventiva';
  urgencia: string | null;
  status: 'aberta' | 'recebida';
  abertaEm: string;
};

const GRUPO_URGENCIA: Record<string, number> = {
  maquina_parou: 0,
  oferecendo_risco: 1,
  trabalhando_com_problema: 2,
};

const GRUPO_PREVENTIVA = 3;
const GRUPO_DESCONHECIDO = 4;

export class FilaOrdem {
  ordenar(itens: FilaItem[]): FilaItem[] {
    return [...itens].sort((esquerda, direita) => this.comparar(esquerda, direita));
  }

  private comparar(esquerda: FilaItem, direita: FilaItem): number {
    const porGrupo = this.grupo(esquerda) - this.grupo(direita);
    if (porGrupo !== 0) return porGrupo;
    return this.instante(esquerda.abertaEm) - this.instante(direita.abertaEm);
  }

  private grupo(item: FilaItem): number {
    if (item.tipo === 'preventiva') return GRUPO_PREVENTIVA;
    if (!item.urgencia) return GRUPO_DESCONHECIDO;
    return GRUPO_URGENCIA[item.urgencia] ?? GRUPO_DESCONHECIDO;
  }

  private instante(iso: string): number {
    return Date.parse(iso);
  }
}
