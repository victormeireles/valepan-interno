import { supabaseClientFactory, APP_DATABASE_SCHEMA } from '@/lib/clients/supabase-client-factory';
import { NextResponse } from 'next/server';

/** Tabelas permitidas na API genérica (evita enumeração arbitrária com service role). */
const ALLOWED_TABLES = ['produtos', 'unidades', 'insumos'] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(value: string | null): value is AllowedTable {
  return value !== null && (ALLOWED_TABLES as readonly string[]).includes(value);
}

function isSafeIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const labelField = searchParams.get('labelField') || 'nome';
    const valueField = searchParams.get('valueField') || 'id';
    const extraFields =
      searchParams
        .get('extraFields')
        ?.split(',')
        .map((field) => field.trim())
        .filter(Boolean) ?? [];
    const selectFields = Array.from(new Set([valueField, labelField, ...extraFields])).join(', ');

    if (!table) {
      return NextResponse.json({ error: 'Table parameter is required' }, { status: 400 });
    }

    if (!isAllowedTable(table)) {
      return NextResponse.json(
        { error: 'Table not allowed', allowed: [...ALLOWED_TABLES], schema: APP_DATABASE_SCHEMA },
        { status: 400 },
      );
    }

    if (!isSafeIdentifier(labelField) || !isSafeIdentifier(valueField)) {
      return NextResponse.json({ error: 'Invalid labelField or valueField' }, { status: 400 });
    }
    for (const f of extraFields) {
      if (!isSafeIdentifier(f)) {
        return NextResponse.json({ error: 'Invalid extraFields' }, { status: 400 });
      }
    }

    const supabase = supabaseClientFactory.createServiceRoleClient();

    // Sem embed `unidades(...)` — no schema `interno` o PostgREST pode falhar; nome_resumido vem de busca à parte.
    const selectQuery = selectFields;

    // Busca genérica na tabela (schema fixo via factory: interno)
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(selectQuery)
      .eq('ativo', true) // Assume que todas tabelas tem campo ativo, se não tiver pode dar erro. Ideal seria parametrizar.
      .order(labelField);

    // Interface para item genérico do banco
    interface GenericItem {
      [key: string]: unknown;
    }

    const t = table as AllowedTable;

    const attachUnidadesNomeResumido = async (rows: GenericItem[] | null | undefined) => {
      if (!rows?.length || (t !== 'insumos' && t !== 'produtos')) return;
      const uids = new Set<string>();
      if (t === 'insumos') {
        for (const r of rows) {
          const id = r.unidade_id;
          if (typeof id === 'string' && id.trim()) uids.add(id);
        }
      } else {
        for (const r of rows) {
          const id = r.unidade_padrao_id;
          if (typeof id === 'string' && id.trim()) uids.add(id);
        }
      }
      if (uids.size === 0) return;
      const { data: unRows } = await supabase.from('unidades').select('id, nome_resumido').in('id', [...uids]);
      const nomeById = new Map((unRows ?? []).map((u) => [u.id, u.nome_resumido ?? '']));
      for (const r of rows) {
        const uid =
          t === 'insumos'
            ? (typeof r.unidade_id === 'string' ? r.unidade_id : '')
            : (typeof r.unidade_padrao_id === 'string' ? r.unidade_padrao_id : '');
        if (uid) {
          r.unidades = { nome_resumido: nomeById.get(uid) ?? '' };
        }
      }
    };

    if (error) {
      // Se falhar por causa do campo ativo, tenta sem ele
      const { data: retryData, error: retryError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(selectQuery)
        .order(labelField);

      if (retryError) throw retryError;

      await attachUnidadesNomeResumido(retryData as unknown as GenericItem[] | null);

      const formatOptionRetry = (item: GenericItem) => {
        const meta = extraFields.reduce<Record<string, unknown>>((acc, field) => {
          acc[field] = item[field];
          return acc;
        }, {});

        // Se for insumos ou produtos e tiver unidades, adicionar nome_resumido ao meta
        if ((table === 'insumos' || table === 'produtos') && item.unidades) {
          const unidades = item.unidades as { nome_resumido?: string } | null;
          if (unidades?.nome_resumido) {
            meta.unidadeNomeResumido = unidades.nome_resumido;
          }
        }

        return {
          label: String(item[labelField]),
          value: String(item[valueField]),
          ...(Object.keys(meta).length > 0 ? { meta } : {}),
        };
      };

      const options =
        (retryData as unknown as GenericItem[] | null)?.map((item) => formatOptionRetry(item)) || [];

      return NextResponse.json({ options });
    }

    await attachUnidadesNomeResumido(data as unknown as GenericItem[] | null);

    const formatOption = (item: GenericItem) => {
      const meta = extraFields.reduce<Record<string, unknown>>((acc, field) => {
        acc[field] = item[field];
        return acc;
      }, {});

      // Se for insumos ou produtos e tiver unidades, adicionar nome_resumido ao meta
      if ((table === 'insumos' || table === 'produtos') && item.unidades) {
        const unidades = item.unidades as { nome_resumido?: string } | null;
        if (unidades?.nome_resumido) {
          meta.unidadeNomeResumido = unidades.nome_resumido;
        }
      }

      return {
        label: String(item[labelField]),
        value: String(item[valueField]),
        ...(Object.keys(meta).length > 0 ? { meta } : {}),
      };
    };

    const options =
      (data as unknown as GenericItem[] | null)?.map((item) => formatOption(item)) || [];

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}
