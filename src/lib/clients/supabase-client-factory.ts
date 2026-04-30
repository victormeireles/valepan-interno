import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/** Schema Postgres usado por este app (domínio isolado de `public`). */
export const APP_DATABASE_SCHEMA = 'interno' as const;

type ClientVariant = 'anon' | 'service';

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
  /** Tipagem usa schema `public` (CLI preenche Relationships); runtime usa `APP_DATABASE_SCHEMA`. */
  private readonly cache: Partial<Record<ClientVariant, SupabaseClient<Database, 'public'>>> = {};

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

  public createAnonClient(): SupabaseClient<Database, 'public'> {
    return this.getOrCreateClient('anon', this.anonKey);
  }

  public createServiceRoleClient(): SupabaseClient<Database, 'public'> {
    return this.getOrCreateClient('service', this.serviceRoleKey);
  }

  private getOrCreateClient(
    variant: ClientVariant,
    key: string,
  ): SupabaseClient<Database, 'public'> {
    const cachedClient = this.cache[variant];
    if (cachedClient) {
      return cachedClient;
    }

    const client = createClient<Database, 'public'>(this.url, key, {
      auth: {
        persistSession: false,
      },
      db: {
        // Satisfaz o generic `public` no createClient; em runtime continua sendo `interno`.
        schema: APP_DATABASE_SCHEMA as unknown as 'public',
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




