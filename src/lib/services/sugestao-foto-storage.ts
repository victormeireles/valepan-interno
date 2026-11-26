import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const BUCKET = 'sugestoes-melhoria';
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class SugestaoFotoStorage {
  constructor(private readonly client?: SupabaseClient) {}

  private get db(): SupabaseClient {
    return this.client ?? supabaseClientFactory.createServiceRoleClient();
  }

  async upload(bytes: Uint8Array, type: string): Promise<string> {
    const path = `${randomUUID()}.${EXT[type] ?? 'bin'}`;
    const { error } = await this.db.storage.from(BUCKET).upload(path, bytes, {
      contentType: type,
      upsert: false,
    });
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
    const { data, error } = await this.db.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
    }
    return map;
  }
}
