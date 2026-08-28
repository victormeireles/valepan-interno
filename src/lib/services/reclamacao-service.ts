import { ReclamacaoCategoriaRepository } from '@/data/reclamacoes/ReclamacaoCategoriaRepository';
import {
  ReclamacaoFotoRepository,
  type ReclamacaoFotoInsertInput,
} from '@/data/reclamacoes/ReclamacaoFotoRepository';
import {
  ReclamacaoRepository,
  type ReclamacaoWriteInput,
} from '@/data/reclamacoes/ReclamacaoRepository';
import { assertLimiteFotos } from '@/domain/reclamacoes/reclamacao-fotos-limite';
import {
  validarReclamacaoSave,
  type ReclamacaoWritePayload,
} from '@/domain/reclamacoes/reclamacao-input';
import { normalizarObservacao } from '@/domain/reclamacoes/reclamacao-observacao';
import type {
  ReclamacaoFotoRecord,
  ReclamacaoListFiltro,
  ReclamacaoListItem,
} from '@/domain/reclamacoes/reclamacao-types';
import type { ReclamacaoUnidade } from '@/domain/reclamacoes/reclamacao-unidade';
import { ReclamacaoFotoStorage } from '@/lib/services/reclamacao-foto-storage';

export type ReclamacaoCreateInput = ReclamacaoWritePayload & {
  criadoPor: string | null;
};

export type ReclamacaoUpdateInput = ReclamacaoWritePayload & {
  fotoIdsRemovidos?: string[];
};

export class ReclamacaoService {
  constructor(
    private readonly reclamacoes: ReclamacaoRepository,
    private readonly fotos: ReclamacaoFotoRepository,
    private readonly storage: ReclamacaoFotoStorage,
    private readonly categorias: ReclamacaoCategoriaRepository,
  ) {}

  async list(filtro: ReclamacaoListFiltro): Promise<ReclamacaoListItem[]> {
    const items = await this.reclamacoes.list(filtro);
    const paths = items.flatMap((item) => item.fotos.map((f) => f.storagePath));
    const urls = await this.storage.signedUrls(paths);
    return items.map((item) => this.applySignedUrls(item, urls));
  }

  async create(input: ReclamacaoCreateInput): Promise<ReclamacaoListItem> {
    const exigeObservacao = await this.exigeObservacaoDaCategoria(
      input.categoriaId,
      { exigirAtiva: true },
    );
    const erro = validarReclamacaoSave({
      ...input,
      exigeObservacao,
      fotosCount: 0,
    });
    if (erro) throw new Error(erro);

    const created = await this.reclamacoes.insert(
      this.toWriteInput(input, input.criadoPor),
    );
    return this.withSignedUrls(created);
  }

  async update(
    id: string,
    input: ReclamacaoUpdateInput,
  ): Promise<ReclamacaoListItem> {
    const atuais = await this.fotos.listByReclamacaoId(id);
    const removidos = new Set(input.fotoIdsRemovidos ?? []);
    const fotosCount = atuais.filter((f) => !removidos.has(f.id)).length;
    const exigeObservacao = await this.exigeObservacaoDaCategoria(
      input.categoriaId,
      { exigirAtiva: false },
    );

    const erro = validarReclamacaoSave({ ...input, exigeObservacao, fotosCount });
    if (erro) throw new Error(erro);

    await this.reclamacoes.update(id, this.toWriteInput(input));

    if (removidos.size > 0) {
      await this.removerFotos(id, [...removidos]);
    }

    const refreshed = await this.reclamacoes.findById(id);
    if (!refreshed) throw new Error('Reclamação não encontrada.');
    return this.withSignedUrls(refreshed);
  }

  async remove(id: string): Promise<void> {
    const fotos = await this.fotos.listByReclamacaoId(id);
    await this.storage.remove(fotos.map((f) => f.storagePath));
    await this.reclamacoes.deleteById(id);
  }

  async anexarFoto(
    reclamacaoId: string,
    bytes: Uint8Array,
  ): Promise<ReclamacaoFotoRecord> {
    const atuais = await this.fotos.listByReclamacaoId(reclamacaoId);
    const erro = assertLimiteFotos(atuais.length + 1);
    if (erro) throw new Error(erro);

    const storagePath = await this.storage.upload(reclamacaoId, bytes);
    const insert: ReclamacaoFotoInsertInput = {
      reclamacaoId,
      storagePath,
      ordem: atuais.length,
    };
    let foto: Awaited<ReturnType<ReclamacaoFotoRepository['insertMany']>>[number];
    try {
      [foto] = await this.fotos.insertMany([insert]);
    } catch (error) {
      try {
        await this.storage.remove([storagePath]);
      } catch {
        // best-effort cleanup
      }
      throw error;
    }
    const urls = await this.storage.signedUrls([storagePath]);
    return {
      ...foto,
      signedUrl: urls.get(storagePath) ?? null,
    };
  }

  async removerFotos(reclamacaoId: string, fotoIds: string[]): Promise<void> {
    if (fotoIds.length === 0) return;

    const atuais = await this.fotos.listByReclamacaoId(reclamacaoId);
    const idSet = new Set(fotoIds);
    const alvo = atuais.filter((f) => idSet.has(f.id));
    if (alvo.length === 0) return;

    await this.storage.remove(alvo.map((f) => f.storagePath));
    await this.fotos.deleteByIds(alvo.map((f) => f.id));
  }

  private async exigeObservacaoDaCategoria(
    categoriaId: string,
    opts: { exigirAtiva: boolean },
  ): Promise<boolean> {
    if (!categoriaId.trim()) throw new Error('Informe a categoria.');
    const categoria = await this.categorias.findById(categoriaId);
    if (!categoria) throw new Error('Informe a categoria.');
    if (opts.exigirAtiva && !categoria.ativa) {
      throw new Error('Categoria inativa.');
    }
    return categoria.exigeObservacao;
  }

  private toWriteInput(
    input: ReclamacaoWritePayload,
    criadoPor?: string | null,
  ): ReclamacaoWriteInput {
    return {
      clienteId: input.clienteId,
      produtoId: input.produtoId,
      categoriaId: input.categoriaId,
      observacao: normalizarObservacao(input.observacao),
      dataFabricacao: input.dataFabricacao,
      dataProblema: input.dataProblema,
      quantidade: input.quantidade,
      unidade: input.unidade as ReclamacaoUnidade,
      criadoPor,
    };
  }

  private async withSignedUrls(
    item: ReclamacaoListItem,
  ): Promise<ReclamacaoListItem> {
    const paths = item.fotos.map((f) => f.storagePath);
    const urls = await this.storage.signedUrls(paths);
    return this.applySignedUrls(item, urls);
  }

  private applySignedUrls(
    item: ReclamacaoListItem,
    urls: Map<string, string>,
  ): ReclamacaoListItem {
    return {
      ...item,
      fotos: item.fotos.map((f) => ({
        ...f,
        signedUrl: urls.get(f.storagePath) ?? null,
      })),
    };
  }
}

export const reclamacaoService = new ReclamacaoService(
  new ReclamacaoRepository(),
  new ReclamacaoFotoRepository(),
  new ReclamacaoFotoStorage(),
  new ReclamacaoCategoriaRepository(),
);
