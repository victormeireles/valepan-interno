import { SupabaseClient } from '@supabase/supabase-js';
import {
  mapOperacaoAutor,
  type AutorJoin,
} from '@/domain/auditoria/operacao-autor';
import { isReclamacaoUnidade } from '@/domain/reclamacoes/reclamacao-unidade';
import type {
  ReclamacaoFotoRecord,
  ReclamacaoListFiltro,
  ReclamacaoListItem,
} from '@/domain/reclamacoes/reclamacao-types';
import type { ReclamacaoUnidade } from '@/domain/reclamacoes/reclamacao-unidade';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const RECLAMACAO_LIST_SELECT = `
id, cliente_id, produto_id, categoria_id, observacao,
data_fabricacao, data_problema, quantidade, unidade,
criado_por, created_at,
cliente:clientes!cliente_id(nome_fantasia),
produto:produtos!produto_id(nome),
categoria:reclamacao_categorias!categoria_id(nome, exige_observacao),
fotos:reclamacao_fotos(id, storage_path, ordem),
autor:usuarios!criado_por(nome)
`.trim();

type NomeJoin = { nome: string } | { nome: string }[] | null | undefined;
type ClienteJoin =
  | { nome_fantasia: string }
  | { nome_fantasia: string }[]
  | null
  | undefined;
type CategoriaJoin =
  | { nome: string; exige_observacao: boolean }
  | { nome: string; exige_observacao: boolean }[]
  | null
  | undefined;
type FotoJoin = {
  id: string;
  storage_path: string;
  ordem: number;
};

type ReclamacaoListRow = {
  id: string;
  cliente_id: string;
  produto_id: string;
  categoria_id: string;
  observacao: string | null;
  data_fabricacao: string;
  data_problema: string;
  quantidade: number;
  unidade: string;
  criado_por: string | null;
  created_at: string;
  cliente: ClienteJoin;
  produto: NomeJoin;
  categoria: CategoriaJoin;
  fotos: FotoJoin[] | null;
  autor: AutorJoin;
};

export type ReclamacaoWriteInput = {
  clienteId: string;
  produtoId: string;
  categoriaId: string;
  observacao: string | null;
  dataFabricacao: string;
  dataProblema: string;
  quantidade: number;
  unidade: ReclamacaoUnidade;
  criadoPor?: string | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapUnidade(value: string): ReclamacaoUnidade {
  if (!isReclamacaoUnidade(value)) {
    throw new Error(`Unidade de reclamação inválida: ${value}`);
  }
  return value;
}

function mapFoto(row: FotoJoin): ReclamacaoFotoRecord {
  return {
    id: row.id,
    storagePath: row.storage_path,
    ordem: row.ordem,
    signedUrl: null,
  };
}

function mapNome(join: NomeJoin, fallback: string): string {
  return unwrapOne(join)?.nome?.trim() || fallback;
}

function mapClienteNome(join: ClienteJoin): string {
  return unwrapOne(join)?.nome_fantasia?.trim() || '';
}

function mapCategoria(join: CategoriaJoin): {
  nome: string;
  exigeObservacao: boolean;
} {
  const cat = unwrapOne(join);
  return {
    nome: cat?.nome?.trim() || '',
    exigeObservacao: cat?.exige_observacao ?? false,
  };
}

function mapReclamacao(row: ReclamacaoListRow): ReclamacaoListItem {
  const categoria = mapCategoria(row.categoria);
  const autor = mapOperacaoAutor(row.criado_por, row.autor);
  const fotos = [...(row.fotos ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map(mapFoto);

  return {
    id: row.id,
    clienteId: row.cliente_id,
    clienteNome: mapClienteNome(row.cliente),
    produtoId: row.produto_id,
    produtoNome: mapNome(row.produto, ''),
    categoriaId: row.categoria_id,
    categoriaNome: categoria.nome,
    categoriaExigeObservacao: categoria.exigeObservacao,
    observacao: row.observacao,
    dataFabricacao: row.data_fabricacao,
    dataProblema: row.data_problema,
    quantidade: row.quantidade,
    unidade: mapUnidade(row.unidade),
    fotos,
    createdAt: row.created_at,
    criadoPor: autor.criadoPor,
    criadoPorNome: autor.criadoPorNome,
  };
}

function toDbWrite(input: ReclamacaoWriteInput) {
  return {
    cliente_id: input.clienteId,
    produto_id: input.produtoId,
    categoria_id: input.categoriaId,
    observacao: input.observacao,
    data_fabricacao: input.dataFabricacao,
    data_problema: input.dataProblema,
    quantidade: input.quantidade,
    unidade: input.unidade,
  };
}

export class ReclamacaoRepository {
  constructor(private readonly supabase?: SupabaseClient<Database>) {}

  private get db(): SupabaseClient {
    const client =
      this.supabase ?? supabaseClientFactory.createServiceRoleClient();
    return client as unknown as SupabaseClient;
  }

  async list(filtro: ReclamacaoListFiltro): Promise<ReclamacaoListItem[]> {
    let query = this.db
      .from('reclamacoes')
      .select(RECLAMACAO_LIST_SELECT)
      .order('data_problema', { ascending: false })
      .order('created_at', { ascending: false });

    if (filtro.clienteId) query = query.eq('cliente_id', filtro.clienteId);
    if (filtro.produtoId) query = query.eq('produto_id', filtro.produtoId);
    if (filtro.categoriaId) query = query.eq('categoria_id', filtro.categoriaId);
    if (filtro.dataProblemaDe) {
      query = query.gte('data_problema', filtro.dataProblemaDe);
    }
    if (filtro.dataProblemaAte) {
      query = query.lte('data_problema', filtro.dataProblemaAte);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar reclamações: ${error.message}`);
    }

    return ((data as ReclamacaoListRow[]) ?? []).map(mapReclamacao);
  }

  async findById(id: string): Promise<ReclamacaoListItem | null> {
    const { data, error } = await this.db
      .from('reclamacoes')
      .select(RECLAMACAO_LIST_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar reclamação: ${error.message}`);
    }

    return data ? mapReclamacao(data as ReclamacaoListRow) : null;
  }

  async insert(input: ReclamacaoWriteInput): Promise<ReclamacaoListItem> {
    const { data, error } = await this.db
      .from('reclamacoes')
      .insert({
        ...toDbWrite(input),
        criado_por: input.criadoPor ?? null,
      })
      .select(RECLAMACAO_LIST_SELECT)
      .single();

    if (error) {
      throw new Error(`Erro ao criar reclamação: ${error.message}`);
    }

    return mapReclamacao(data as ReclamacaoListRow);
  }

  async update(id: string, input: ReclamacaoWriteInput): Promise<ReclamacaoListItem> {
    const { data, error } = await this.db
      .from('reclamacoes')
      .update({
        ...toDbWrite(input),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(RECLAMACAO_LIST_SELECT)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar reclamação: ${error.message}`);
    }

    return mapReclamacao(data as ReclamacaoListRow);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.db.from('reclamacoes').delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir reclamação: ${error.message}`);
    }
  }
}

export const reclamacaoRepository = new ReclamacaoRepository();
