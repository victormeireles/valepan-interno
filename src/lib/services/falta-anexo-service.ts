import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { FaltaAnexoStorage } from '@/lib/services/falta-anexo-storage';

export class FaltaAnexoNaoEncontradaError extends Error {
  constructor() {
    super('Falta não encontrada.');
    this.name = 'FaltaAnexoNaoEncontradaError';
  }
}

export class FaltaAnexoService {
  constructor(
    private readonly storage = new FaltaAnexoStorage(),
    private readonly clientOverride?: SupabaseClient,
  ) {}

  private get db(): SupabaseClient {
    return (
      this.clientOverride ??
      (supabaseClientFactory.createServiceRoleClient() as unknown as SupabaseClient)
    );
  }

  async anexar(
    faltaId: string,
    bytes: Uint8Array,
  ): Promise<{ storagePath: string; signedUrl: string }> {
    const atual = await this.lerPath(faltaId);
    const storagePath = await this.storage.upload(faltaId, bytes);
    try {
      await this.gravarPath(faltaId, storagePath);
    } catch (error) {
      await this.storage.remove([storagePath]).catch(() => undefined);
      throw error;
    }
    if (atual) await this.storage.remove([atual]);
    const signedUrl = (await this.storage.signedUrl(storagePath)) ?? '';
    return { storagePath, signedUrl };
  }

  async remover(faltaId: string): Promise<void> {
    const atual = await this.lerPath(faltaId);
    await this.gravarPath(faltaId, null);
    if (atual) await this.storage.remove([atual]);
  }

  async url(faltaId: string): Promise<string | null> {
    const path = await this.lerPath(faltaId);
    if (!path) return null;
    return this.storage.signedUrl(path);
  }

  private async lerPath(faltaId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('pessoas_faltas')
      .select('anexo_storage_path')
      .eq('id', faltaId)
      .is('cancelada_em', null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new FaltaAnexoNaoEncontradaError();
    return (data as { anexo_storage_path: string | null }).anexo_storage_path;
  }

  private async gravarPath(faltaId: string, path: string | null): Promise<void> {
    const { error } = await this.db
      .from('pessoas_faltas')
      .update({ anexo_storage_path: path })
      .eq('id', faltaId)
      .is('cancelada_em', null);
    if (error) throw new Error(error.message);
  }
}

export const faltaAnexoService = new FaltaAnexoService();
