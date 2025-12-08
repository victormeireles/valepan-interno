import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const labelField = searchParams.get('labelField') || 'nome';
    const valueField = searchParams.get('valueField') || 'id';
    const extraFields = searchParams
      .get('extraFields')
      ?.split(',')
      .map((field) => field.trim())
      .filter(Boolean) ?? [];
    const selectFields = Array.from(new Set([valueField, labelField, ...extraFields])).join(', ');

    if (!table) {
      return NextResponse.json({ error: 'Table parameter is required' }, { status: 400 });
    }

    const supabase = supabaseClientFactory.createServiceRoleClient();
    
    // Se for insumos ou produtos (com unidade_padrao_id), fazer join com unidades para trazer nome_resumido
    let selectQuery: string;
    if (table === 'insumos') {
      const baseFields = Array.from(new Set([valueField, labelField, ...extraFields])).join(', ');
      selectQuery = `${baseFields}, unidades (nome_resumido)`;
    } else if (table === 'produtos' && extraFields.includes('unidade_padrao_id')) {
      const baseFields = Array.from(new Set([valueField, labelField, ...extraFields])).join(', ');
      selectQuery = `${baseFields}, unidades (nome_resumido)`;
    } else {
      selectQuery = selectFields;
    }
    
    // Busca genérica na tabela
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

    if (error) {
      // Se falhar por causa do campo ativo, tenta sem ele
      const { data: retryData, error: retryError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(selectQuery)
        .order(labelField);
        
      if (retryError) throw retryError;
      
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
