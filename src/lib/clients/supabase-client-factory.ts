import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type ClientVariant = 'anon' | 'service';

/** Cliente sem `Database` genérico: tipos gerados cobrem só `interno`. */
export type SupabasePublicSchemaClient = SupabaseClient;

export type SupabaseClientFactoryOptions = {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
};

/**
 * Responsável por instanciar clientes do Supabase respeitando
 * as credenciais adequadas para cada fluxo (anon ou service role).
 * Mantém cache local para evitar recriações desnecessárias.
 */
export class SupabaseClientFactory {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;
  private readonly cache: Partial<Record<ClientVariant, SupabaseClient<Database>>> = {};
  private serviceRolePublicClient: SupabasePublicSchemaClient | null = null;

  constructor(options?: Partial<SupabaseClientFactoryOptions>) {
    const url = options?.url ?? process.env.SUPABASE_URL;
    const anonKey = options?.anonKey ?? process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = options?.serviceRoleKey ?? process.env.SERVICE_ROLE;

    this.assertValue(url, 'SUPABASE_URL');
    this.assertValue(anonKey, 'SUPABASE_ANON_KEY');
    this.assertValue(serviceRoleKey, 'SERVICE_ROLE');

    this.url = url!;
    this.anonKey = anonKey!;
    this.serviceRoleKey = serviceRoleKey!;
  }

  public createAnonClient(): SupabaseClient<Database> {
    return this.getOrCreateClient('anon', this.anonKey);
  }

  public createServiceRoleClient(): SupabaseClient<Database> {
    return this.getOrCreateClient('service', this.serviceRoleKey);
  }

  /**
   * Service role com schema `public` (ex.: catálogos criados por migrações em `public`
   * enquanto o app usa `interno` em `createServiceRoleClient`).
   */
  public createServiceRolePublicClient(): SupabasePublicSchemaClient {
    if (this.serviceRolePublicClient) {
      return this.serviceRolePublicClient;
    }
    const client = createClient(this.url, this.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
    this.serviceRolePublicClient = client;
    return client;
  }

  private getOrCreateClient(
    variant: ClientVariant,
    key: string,
  ): SupabaseClient<Database> {
    const cachedClient = this.cache[variant];
    if (cachedClient) {
      return cachedClient;
    }

    const client = createClient<Database>(this.url, key, {
      auth: {
        persistSession: false,
      },
      db: {
        schema: 'interno',
      },
    });

    this.cache[variant] = client;
    return client;
  }

  private assertValue(value: string | undefined, envKey: string): asserts value is string {
    if (!value) {
      throw new Error(`Variável de ambiente ${envKey} não configurada`);
    }
  }
}

export const supabaseClientFactory = new SupabaseClientFactory();




