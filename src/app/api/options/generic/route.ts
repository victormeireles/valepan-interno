import { auth } from '@/lib/auth';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { GenericOptionsAllowlist } from '@/lib/auth/generic-options-allowlist';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { NextResponse } from 'next/server';

const allowlist = new GenericOptionsAllowlist();
const accessManager = new InternoAccessManager();

type GenericItem = {
  [key: string]: unknown;
};

function formatOption(
  table: string,
  item: GenericItem,
  labelField: string,
  valueField: string,
  extraFields: string[],
) {
  const meta = extraFields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = item[field];
    return acc;
  }, {});

  if ((table === 'insumos' || table === 'produtos') && item.unidades) {
    const unidades = item.unidades as {
      nome_resumido?: string;
      codigo?: string;
    } | null;
    if (unidades?.nome_resumido) {
      meta.unidadeNomeResumido = unidades.nome_resumido;
    }
    if (unidades?.codigo) {
      meta.unidadeCodigo = unidades.codigo;
    }
  }

  return {
    label: String(item[labelField]),
    value: String(item[valueField]),
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

function buildSelectQuery(
  table: string,
  valueField: string,
  labelField: string,
  extraFields: string[],
): string {
  const baseFields = Array.from(
    new Set([valueField, labelField, ...extraFields]),
  ).join(', ');

  if (table === 'insumos') {
    return `${baseFields}, unidades (nome_resumido, codigo)`;
  }

  if (table === 'produtos' && extraFields.includes('unidade_padrao_id')) {
    return `${baseFields}, unidades (nome_resumido, codigo)`;
  }

  return baseFields;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedResult = allowlist.resolve({
      table: searchParams.get('table') ?? '',
      labelField: searchParams.get('labelField') || 'nome',
      valueField: searchParams.get('valueField') || 'id',
      extraFields:
        searchParams
          .get('extraFields')
          ?.split(',')
          .map((field) => field.trim())
          .filter(Boolean) ?? [],
    });

    if (!resolvedResult.ok) {
      return NextResponse.json(
        { error: resolvedResult.error },
        { status: resolvedResult.status },
      );
    }

    const { resolved } = resolvedResult;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const snap = sessionToAuthzSnapshot(session);
    if (!accessManager.podeAcessarApp(snap)) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
    }

    const temModulo = resolved.modulos.some((modulo) =>
      accessManager.temModulo(snap, modulo, resolved.minimo),
    );
    if (!temModulo) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const selectQuery = buildSelectQuery(
      resolved.table,
      resolved.valueField,
      resolved.labelField,
      resolved.extraFields,
    );

    const supabase = supabaseClientFactory.createServiceRoleClient();

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(resolved.table as any)
      .select(selectQuery)
      .eq('ativo', true)
      .order(resolved.labelField);

    if (error) {
      const { data: retryData, error: retryError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(resolved.table as any)
        .select(selectQuery)
        .order(resolved.labelField);

      if (retryError) throw retryError;

      const options =
        (retryData as unknown as GenericItem[] | null)?.map((item) =>
          formatOption(
            resolved.table,
            item,
            resolved.labelField,
            resolved.valueField,
            resolved.extraFields,
          ),
        ) || [];

      return NextResponse.json({ options });
    }

    const options =
      (data as unknown as GenericItem[] | null)?.map((item) =>
        formatOption(
          resolved.table,
          item,
          resolved.labelField,
          resolved.valueField,
          resolved.extraFields,
        ),
      ) || [];

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}
