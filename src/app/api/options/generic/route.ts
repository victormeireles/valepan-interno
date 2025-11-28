import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const labelField = searchParams.get('labelField') || 'nome';
    const valueField = searchParams.get('valueField') || 'id';

    if (!table) {
      return NextResponse.json({ error: 'Table parameter is required' }, { status: 400 });
    }

    const supabase = supabaseClientFactory.createServiceRoleClient();
    
    // Busca genérica na tabela
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from(table as any)
      .select(`${valueField}, ${labelField}`)
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
        .select(`${valueField}, ${labelField}`)
        .order(labelField);
        
      if (retryError) throw retryError;
      
      // Formatar para o componente Autocomplete
      const options = (retryData as unknown as GenericItem[] | null)?.map((item) => ({
        label: String(item[labelField]),
        value: String(item[valueField])
      })) || [];

      return NextResponse.json({ options });
    }

    const options = (data as unknown as GenericItem[] | null)?.map((item) => ({
      label: String(item[labelField]),
      value: String(item[valueField])
    })) || [];

    return NextResponse.json({ options });

  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}
