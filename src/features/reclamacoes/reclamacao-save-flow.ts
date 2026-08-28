import { ERRO_SALVAR_RECLAMACAO } from '@/domain/reclamacoes/reclamacao-mensagens';
import type { ReclamacaoWritePayload } from '@/domain/reclamacoes/reclamacao-input';

export type ReclamacaoSavePayload = ReclamacaoWritePayload;

export type ReclamacaoSaveResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ReclamacaoSaveDeps = {
  create: (
    input: ReclamacaoSavePayload,
  ) => Promise<ReclamacaoSaveResult<{ id: string }>>;
  update: (
    id: string,
    input: ReclamacaoSavePayload & { fotoIdsRemovidos: string[] },
  ) => Promise<ReclamacaoSaveResult<{ id: string }>>;
  remove: (id: string) => Promise<unknown>;
  postFoto: (reclamacaoId: string, file: File) => Promise<boolean>;
  compress: (file: File) => Promise<File>;
};

export type SalvarReclamacaoInput = {
  mode: 'create' | 'update';
  id?: string;
  payload: ReclamacaoSavePayload;
  fotoIdsRemovidos: string[];
  arquivosNovos: File[];
};

async function anexarArquivos(
  deps: ReclamacaoSaveDeps,
  reclamacaoId: string,
  arquivos: File[],
): Promise<boolean> {
  try {
    for (const arquivo of arquivos) {
      const compressed = await deps.compress(arquivo);
      const ok = await deps.postFoto(reclamacaoId, compressed);
      if (!ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function salvarReclamacaoComFotos(
  deps: ReclamacaoSaveDeps,
  input: SalvarReclamacaoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.mode === 'create') {
    const created = await deps.create(input.payload);
    if (!created.success) {
      return { ok: false, error: created.error };
    }
    const anexou = await anexarArquivos(deps, created.data.id, input.arquivosNovos);
    if (!anexou) {
      await deps.remove(created.data.id);
      return { ok: false, error: ERRO_SALVAR_RECLAMACAO };
    }
    return { ok: true };
  }

  if (!input.id) {
    return { ok: false, error: ERRO_SALVAR_RECLAMACAO };
  }

  const updated = await deps.update(input.id, {
    ...input.payload,
    fotoIdsRemovidos: input.fotoIdsRemovidos,
  });
  if (!updated.success) {
    return { ok: false, error: updated.error };
  }

  const anexou = await anexarArquivos(deps, updated.data.id, input.arquivosNovos);
  if (!anexou) {
    return { ok: false, error: ERRO_SALVAR_RECLAMACAO };
  }
  return { ok: true };
}
