import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const BUCKET = 'reclamacoes';
const SIGNED_TTL_SEC = 3600;

export class ReclamacaoFotoStorage {
  constructor(private readonly client?: SupabaseClient<Database>) {}

  private get db(): SupabaseClient {
    const resolved =
      this.client ?? supabaseClientFactory.createServiceRoleClient();
    return resolved as unknown as SupabaseClient;
  }

  async upload(reclamacaoId: string, bytes: Uint8Array): Promise<string> {
    const path = `${reclamacaoId}/${randomUUID()}.jpg`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);
    return path;
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await this.db.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);
  }

  async signedUrls(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (paths.length === 0) return map;
    const { data, error } = await this.db.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_TTL_SEC);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
    }
    return map;
  }
}
