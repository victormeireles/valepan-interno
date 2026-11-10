import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type ClienteOrdem = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
export type PecaOrdemVista = {
  pecaId: string;
  nome: string;
  quantidade: string;
  custoUnitarioCentavos: number | null;
  custoTotalCentavos: number | null;
};

export type AjudanteOrdemVista = {
  id: string;
  nome: string;
};

type NomeTabela = 'usuarios' | 'manutencao_maquinas' | 'pessoas_setores' | 'manutencao_pecas';
type PecaBruta = {
  peca_id: string;
  quantidade: string | number;
  custo_unitario_centavos: number;
  custo_total_centavos: number;
};

export class OrdemLeitura {
  constructor(private readonly client: ClienteOrdem) {}

  async setoresPorCodigos(codigos: string[]): Promise<string[]> {
    const unicos = [...new Set(codigos.filter(Boolean))];
    if (unicos.length === 0) return [];
    const { data, error } = await this.client
      .from('pessoas_setores' as never)
      .select('id, nome, tipo, ativo, codigo')
      .in('codigo', unicos);
    if (error) throw new Error(error.message);
    return new SetorOperacional()
      .filtrar((data ?? []) as SetorLinha[])
      .map((setor) => setor.id);
  }

  async nomesPorId(tabela: NomeTabela, ids: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter((id) => id))];
    if (unicos.length === 0) return new Map();
    const { data, error } = await this.client
      .from(tabela as never)
      .select('id, nome')
      .in('id', unicos);
    if (error) throw new Error(error.message);
    const mapa = new Map<string, string>();
    for (const linha of (data ?? []) as { id: string; nome: string }[]) {
      mapa.set(linha.id, linha.nome);
    }
    return mapa;
  }

  async nomeUsuario(usuarioId: string): Promise<string> {
    const nomes = await this.nomesPorId('usuarios', [usuarioId]);
    return (nomes.get(usuarioId) ?? '').trim();
  }

  async pecas(ordemId: string, veValores: boolean): Promise<PecaOrdemVista[]> {
    const linhas = await this.linhasPeca(ordemId);
    const nomes = await this.nomesPorId(
      'manutencao_pecas',
      linhas.map((linha) => linha.peca_id),
    );
    return linhas
      .map((linha) => this.paraPeca(linha, nomes, veValores))
      .sort((esquerda, direita) => esquerda.nome.localeCompare(direita.nome, 'pt-BR'));
  }

  async ajudantes(ordemId: string): Promise<AjudanteOrdemVista[]> {
    const { data, error } = await this.client
      .from('manutencao_ordem_ajudantes' as never)
      .select('usuario_id')
      .eq('ordem_id', ordemId);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as { usuario_id: string }[]).map((linha) => linha.usuario_id);
    const nomes = await this.nomesPorId('usuarios', ids);
    return ids
      .map((id) => ({ id, nome: nomes.get(id) ?? '' }))
      .sort((esquerda, direita) => esquerda.nome.localeCompare(direita.nome, 'pt-BR'));
  }

  private async linhasPeca(ordemId: string): Promise<PecaBruta[]> {
    const { data, error } = await this.client
      .from('manutencao_ordem_pecas' as never)
      .select('peca_id, quantidade, custo_unitario_centavos, custo_total_centavos')
      .eq('ordem_id', ordemId);
    if (error) throw new Error(error.message);
    return (data ?? []) as PecaBruta[];
  }

  private paraPeca(
    linha: PecaBruta,
    nomes: Map<string, string>,
    veValores: boolean,
  ): PecaOrdemVista {
    const quantidade =
      typeof linha.quantidade === 'string' ? linha.quantidade : String(linha.quantidade);
    return {
      pecaId: linha.peca_id,
      nome: nomes.get(linha.peca_id) ?? '',
      quantidade,
      custoUnitarioCentavos: veValores ? linha.custo_unitario_centavos : null,
      custoTotalCentavos: veValores ? linha.custo_total_centavos : null,
    };
  }
}
