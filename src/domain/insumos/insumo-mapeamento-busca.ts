export type MapeamentoAbaId = 'pendencias' | 'ignorados' | 'vinculos';

export type MapeamentoBuscaContagens = {
  pendencias: number;
  ignorados: number;
  vinculos: number;
};

export type MapeamentoBuscaResultado = {
  tabCounts: MapeamentoBuscaContagens;
  abasComResultado: MapeamentoAbaId[];
};

export type MapeamentoBuscaEmptyAtalho = {
  aba: MapeamentoAbaId;
  label: string;
  count: number;
};

export type MapeamentoBuscaEmptyModel = {
  title: string;
  description: string;
  atalhos: MapeamentoBuscaEmptyAtalho[];
  mostrarLimparBusca: boolean;
};

const MAPEAMENTO_ABAS_ORDEM: MapeamentoAbaId[] = ['pendencias', 'ignorados', 'vinculos'];

const MAPEAMENTO_ABA_LABEL: Record<MapeamentoAbaId, string> = {
  pendencias: 'Pendências',
  ignorados: 'Ignorados',
  vinculos: 'Vínculos',
};

const MAPEAMENTO_ABA_ATALHO_LABEL: Record<MapeamentoAbaId, string> = {
  pendencias: 'Ir para Pendências',
  ignorados: 'Ir para Ignorados',
  vinculos: 'Ir para Vínculos',
};

function listarAbasComContagemPositiva(contagens: MapeamentoBuscaContagens): MapeamentoAbaId[] {
  return MAPEAMENTO_ABAS_ORDEM.filter((aba) => contagens[aba] > 0);
}

export class InsumoMapeamentoBuscaCoordinator {
  build(input: {
    searchActive: boolean;
    filtrados: MapeamentoBuscaContagens;
    totais: MapeamentoBuscaContagens;
  }): MapeamentoBuscaResultado {
    const tabCounts = input.searchActive ? input.filtrados : input.totais;
    return {
      tabCounts,
      abasComResultado: listarAbasComContagemPositiva(tabCounts),
    };
  }
}

export class InsumoMapeamentoBuscaEmptyBuilder {
  build(input: {
    searchTerm: string;
    activeTab: MapeamentoAbaId;
    resultado: MapeamentoBuscaResultado;
  }): MapeamentoBuscaEmptyModel | null {
    if (!input.searchTerm.trim()) {
      return null;
    }

    if (input.resultado.tabCounts[input.activeTab] > 0) {
      return null;
    }

    const outrasAbasComResultado = MAPEAMENTO_ABAS_ORDEM.filter(
      (aba) => aba !== input.activeTab && input.resultado.tabCounts[aba] > 0,
    );

    if (outrasAbasComResultado.length === 0) {
      return {
        title: 'Nenhum resultado para esta busca.',
        description: 'Tente outro número de NF, produto ou fornecedor.',
        atalhos: [],
        mostrarLimparBusca: true,
      };
    }

    const description = outrasAbasComResultado
      .map((aba) => `${input.resultado.tabCounts[aba]} em ${MAPEAMENTO_ABA_LABEL[aba]}`)
      .join(' · ');

    const atalhos: MapeamentoBuscaEmptyAtalho[] = outrasAbasComResultado.map((aba) => ({
      aba,
      label: MAPEAMENTO_ABA_ATALHO_LABEL[aba],
      count: input.resultado.tabCounts[aba],
    }));

    return {
      title: 'Nenhum resultado nesta aba.',
      description,
      atalhos,
      mostrarLimparBusca: true,
    };
  }
}
